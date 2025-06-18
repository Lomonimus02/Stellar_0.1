import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { dbStorage } from "./db-storage";
import { decrypt } from "./utils/encryption"; // Import decrypt function

// Используем хранилище БД для всех операций
const dataStorage = dbStorage;
import { User, UserRoleEnum, UserRole } from "@shared/schema";

// Augment Express types to include the full user object with roles
declare global {
  namespace Express {
    interface User extends Omit<User, 'password'> { // Exclude password for safety
      roles: UserRole[]; // Add the roles array
      // activeRole is already part of the User type from schema
    }
  }
}

// Use type augmentation for Express session
declare module 'express-session' {
  interface SessionData {
    passport: {
      // Store the full user object in the session now
      user: Express.User;
    };
  }
}

// Определяем тип для socket с шифрованием 
interface EncryptedSocket {
  encrypted: boolean;
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if the stored password is already hashed (has a salt)
  if (stored.includes(".")) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // For plaintext passwords (like initial admin user), do a direct comparison
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  // Определяем, работаем ли мы в production и доступен ли HTTPS
  const isHttpsAvailable = Boolean(process.env.HTTPS_AVAILABLE) || process.env.NODE_ENV === 'production';
  
  // Базовые настройки сессии
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "school-management-secret",
    resave: false,
    saveUninitialized: false,
    store: dataStorage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true, // Защита от XSS атак, должна быть всегда включена
      sameSite: 'lax' // Защита от CSRF атак, но позволяет переходы с других сайтов
    }
  };
  
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  // Middleware для динамической настройки secure атрибута cookie
  // Должно идти после инициализации сессии, но до пасспорта
  app.use((req, res, next) => {
    // Определяем, использует ли запрос HTTPS
    const isSecureRequest = Boolean(
      req.secure || // Стандартное свойство Express
      req.header('x-forwarded-proto') === 'https' || // Для запросов через прокси
      req.header('x-forwarded-ssl') === 'on' || // Альтернативный заголовок
      (req.socket && typeof (req.socket as any).encrypted !== 'undefined' && (req.socket as any).encrypted) // Безопасная проверка шифрования сокета с явным приведением типа
    );
    
    // Устанавливаем secure атрибут только для HTTPS запросов
    if (req.session && req.session.cookie) {
      req.session.cookie.secure = isSecureRequest;
      
      // Логируем состояние безопасности для отладки
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`Cookie secure set to ${isSecureRequest ? 'true' : 'false'} for request to ${req.path}`);
      }
    }
    
    next();
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await dataStorage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        // Remove password before attaching to request/session
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword as Express.User); // Cast to Express.User (without roles initially)
      }
    }),
  );

  // Serialize the entire user object (including roles) into the session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  // Deserialize user directly from the session object
  passport.deserializeUser(async (user: Express.User, done) => {
    // Basic validation: check if user object exists
    if (!user) {
        console.error(`No user object found in session.`);
        return done(new Error('Invalid session data: User missing.'), null);
    }

    // If roles are missing or session is outdated, fetch fresh data from DB
    if (!user.roles || user.roles.length === 0) {
        console.log(`User ${user.username} has no roles in session, fetching from database...`);
        try {
            const userRoles = await dataStorage.getUserRoles(user.id);
            user.roles = userRoles;

            if (userRoles.length === 0) {
                console.error(`User ${user.username} has no roles in database either.`);
                return done(new Error('User has no roles assigned.'), null);
            }
        } catch (error) {
            console.error(`Failed to fetch roles for user ${user.username}:`, error);
            return done(new Error('Failed to fetch user roles.'), null);
        }
    }

    // Validate and fix active role
    const allRoles = user.roles.map(r => r.role);
    if (user.activeRole && !allRoles.includes(user.activeRole)) {
        console.warn(`Session activeRole '${user.activeRole}' invalid for user '${user.username}', defaulting to '${user.roles[0]?.role}' for this request.`);
        user.activeRole = user.roles[0].role;

        // Update the database with the corrected active role
        try {
            await dataStorage.updateUser(user.id, { activeRole: user.activeRole });
        } catch (error) {
            console.error(`Failed to update active role for user ${user.username}:`, error);
        }
    } else if (!user.activeRole && user.roles.length > 0) {
        user.activeRole = user.roles[0].role;
        console.log(`Session activeRole not set for user '${user.username}', defaulting to '${user.activeRole}' for this request.`);

        // Update the database with the active role
        try {
            await dataStorage.updateUser(user.id, { activeRole: user.activeRole });
        } catch (error) {
            console.error(`Failed to set active role for user ${user.username}:`, error);
        }
    }

    return done(null, user); // Return the user object from session
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if the user is authorized to create this type of user
      if (req.isAuthenticated()) {
        const currentUser = req.user as User;
        const newUserRole = req.body.role;
        
        // Get user's primary role for permission checks
        const primaryRole = await dataStorage.getUserPrimaryRole(currentUser.id);

        // Validate permissions based on user roles
        if (primaryRole !== UserRoleEnum.SUPER_ADMIN &&
            (newUserRole === UserRoleEnum.SUPER_ADMIN ||
             newUserRole === UserRoleEnum.SCHOOL_ADMIN && primaryRole !== UserRoleEnum.SCHOOL_ADMIN)) {
          return res.status(403).send("У вас нет прав для создания пользователя с данной ролью");
        }

        // School admin can only create users for their school
        if (primaryRole === UserRoleEnum.SCHOOL_ADMIN &&
            req.body.schoolId !== currentUser.schoolId) {
          return res.status(403).send("Вы можете создавать пользователей только для своей школы");
        }
      } else {
        // Check if there are any users in the system
        const usersCount = await dataStorage.getUsersCount();
        if (usersCount > 0 && req.body.role === UserRoleEnum.SUPER_ADMIN) {
          return res.status(403).send("Супер-администратор уже существует");
        }
        if (usersCount > 0 && req.body.role !== UserRoleEnum.SUPER_ADMIN) {
          return res.status(403).send("Необходима авторизация для регистрации");
        }
      }
      
      // Check if username already exists
      const existingUser = await dataStorage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Пользователь с таким логином уже существует");
      }

      // Create the user (without role field)
      const hashedPassword = await hashPassword(req.body.password);
      const { role, ...userDataWithoutRole } = req.body;
      const user = await dataStorage.createUser({
        ...userDataWithoutRole,
        password: hashedPassword,
      });

      // Add the primary role to user_roles table
      await dataStorage.addUserRole({
        userId: user.id,
        role: req.body.role,
        schoolId: req.body.schoolId || null,
        classId: null
      });

      // Set the active role to the primary role
      await dataStorage.updateUser(user.id, { activeRole: req.body.role });

      // Log the new user creation
      if (req.isAuthenticated()) {
        const currentUser = req.user as User;
        await dataStorage.createSystemLog({
          userId: currentUser.id,
          action: "user_created",
          details: `Created user ${user.username} with role ${req.body.role}`,
          ipAddress: req.ip
        });
      }

      // If not already authenticated, log the new user in
      if (!req.isAuthenticated()) {
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(user);
        });
      } else {
        res.status(201).json(user);
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      // User is authenticated, req.user contains basic user info (without password)
      const user = req.user as Express.User; // Cast to include roles later

      // Fetch user roles ONCE during login
      const userRoles = await dataStorage.getUserRoles(user.id);
      user.roles = userRoles; // Attach roles to the user object

      // Check/Set activeRole during login, potentially updating the DB *once* if needed
      let activeRoleToSet = user.activeRole;
      const allRoles = userRoles.map(r => r.role);

      if (user.activeRole) {
        if (!allRoles.includes(user.activeRole)) {
          activeRoleToSet = userRoles.length > 0 ? userRoles[0].role : undefined;
          console.log(`Active role ${user.activeRole} invalid on login for ${user.username}, switching to ${activeRoleToSet}`);
          // Update DB *only* if the active role was invalid and needs correction
          if (activeRoleToSet) {
            await dataStorage.updateUser(user.id, { activeRole: activeRoleToSet });
            user.activeRole = activeRoleToSet; // Update the user object being sent/serialized
          }
        }
      } else {
        // If active role wasn't set, set it to the first available one
        activeRoleToSet = userRoles.length > 0 ? userRoles[0].role : undefined;
        if (activeRoleToSet) {
             console.log(`Active role not set on login for ${user.username}, setting to ${activeRoleToSet}`);
            // Update DB *only* if we are setting an active role for the first time
            await dataStorage.updateUser(user.id, { activeRole: activeRoleToSet });
            user.activeRole = activeRoleToSet; // Update the user object being sent/serialized
        }
      }
      
      // Log the login
      await dataStorage.createSystemLog({
        userId: user.id,
        action: "user_login",
        details: `User ${user.username} logged in with activeRole ${user.activeRole}`,
        ipAddress: req.ip
      });

      // Regenerate session after login to prevent session fixation
      req.session.regenerate(err => {
        if (err) {
          console.error("Error regenerating session:", err);
          return res.status(500).json({ message: "Login failed due to session error." });
        }
        // Store the updated user object (with roles and corrected activeRole) in the new session
        req.login(user, loginErr => {
          if (loginErr) {
             console.error("Error storing user in new session:", loginErr);
            return res.status(500).json({ message: "Login failed during session storage." });
          }
          // Send the full user object (with roles) to the client
          res.status(200).json(user);
        });
      });

    } catch (error) {
      console.error("Error during login process:", error);
      res.status(500).json({ message: "An error occurred during login." });
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    if (req.isAuthenticated()) {
      const user = req.user as User;
      
      // Log the logout
      await dataStorage.createSystemLog({
        userId: user.id,
        action: "user_logout",
        details: `User ${user.username} logged out`,
        ipAddress: req.ip
      });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.sendStatus(401);
    }
    
    // Decrypt user data before sending
    const userToSend = { ...req.user };
    
    // Define fields to decrypt
    const fieldsToDecrypt: (keyof Express.User)[] = ['firstName', 'lastName', 'email', 'middleName', 'address']; 
    
    for (const field of fieldsToDecrypt) {
        if (userToSend[field] && typeof userToSend[field] === 'string') {
            userToSend[field] = decrypt(userToSend[field] as string);
        }
    }
    
    // Send the decrypted user data
    res.json(userToSend);
  });
}
