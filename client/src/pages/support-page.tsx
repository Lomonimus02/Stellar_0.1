import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Mail, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { SupportChat } from "@/components/support-chat";

const faqs = [
  {
    question: "Как получить доступ к системе?",
    answer: "Доступ предоставляется администратором школы. Обратитесь к ответственному лицу в вашей школе для получения учетных данных."
  },
  {
    question: "Как сменить пароль?",
    answer: "Перейдите в раздел 'Настройки', выберите вкладку 'Безопасность' и нажмите кнопку 'Сменить пароль'."
  },
  {
    question: "Как отправить сообщение учителю или ученику?",
    answer: "Перейдите в раздел 'Сообщения', выберите получателя из списка и нажмите кнопку 'Написать сообщение'."
  },
  {
    question: "Как просмотреть оценки?",
    answer: "Перейдите в раздел 'Оценки', где вы увидите все свои оценки по предметам и периодам."
  },
  {
    question: "Как настроить уведомления?",
    answer: "В разделе 'Настройки' выберите вкладку 'Уведомления' и настройте предпочтительные способы получения уведомлений."
  }
];

export default function SupportPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the message to a server
    console.log({ name, email, message });
    setSubmitted(true);
    toast({
      title: "Сообщение отправлено",
      description: "Мы ответим вам в ближайшее время.",
    });
  };

  return (
    <MainLayout>
      <SupportChat />
      <div className="container mx-auto py-10 px-4 md:px-6">
        <h1 className="text-4xl font-bold mb-8">Поддержка</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Телефон
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>+7 (999) 123-45-67</p>
              <p className="text-sm text-muted-foreground mt-2">Пн-Пт: 9:00 - 18:00</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>support@schoolsystem.com</p>
              <p className="text-sm text-muted-foreground mt-2">Мы отвечаем в течение 24 часов</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Чат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Онлайн-чат с поддержкой</p>
              <p className="text-sm text-muted-foreground mt-2">Доступен в рабочее время</p>
              <Button 
                onClick={() => {
                  const chatButton = document.querySelector('[data-support-chat-button]') as HTMLButtonElement;
                  if (chatButton) chatButton.click();
                }} 
                className="mt-3"
              >
                Начать чат
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-6">Часто задаваемые вопросы</h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-6">Связаться с нами</h2>
            {submitted ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                    Сообщение отправлено
                  </CardTitle>
                  <CardDescription>
                    Спасибо за ваше обращение! Мы рассмотрим его и ответим вам в ближайшее время.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button onClick={() => setSubmitted(false)}>Отправить еще одно сообщение</Button>
                </CardFooter>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Форма обратной связи</CardTitle>
                  <CardDescription>
                    Заполните форму, и наши специалисты свяжутся с вами в ближайшее время
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">
                        Имя
                      </label>
                      <Input 
                        id="name" 
                        placeholder="Введите ваше имя" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email
                      </label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="Введите ваш email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Сообщение
                      </label>
                      <Textarea 
                        id="message" 
                        placeholder="Опишите вашу проблему или вопрос" 
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required 
                      />
                    </div>
                    
                    <Button type="submit" className="w-full">
                      Отправить сообщение
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}