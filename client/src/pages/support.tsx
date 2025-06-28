import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Mail, MessageSquare, PhoneCall } from "lucide-react";

export default function SupportPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-heading font-bold text-gray-800">Техническая поддержка</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                Часто задаваемые вопросы
              </CardTitle>
              <CardDescription>
                Ответы на самые распространенные вопросы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium flex items-center">
                  <HelpCircle className="mr-2 h-4 w-4 text-primary" />
                  Как сменить пароль?
                </h3>
                <p className="text-sm text-gray-500 pl-6">
                  Перейдите в раздел "Настройки", выберите вкладку "Безопасность" и следуйте инструкциям для смены пароля.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium flex items-center">
                  <HelpCircle className="mr-2 h-4 w-4 text-primary" />
                  Как настроить уведомления?
                </h3>
                <p className="text-sm text-gray-500 pl-6">
                  В разделе "Настройки" выберите вкладку "Уведомления", где вы можете настроить способы и типы уведомлений.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium flex items-center">
                  <HelpCircle className="mr-2 h-4 w-4 text-primary" />
                  Как загрузить документы?
                </h3>
                <p className="text-sm text-gray-500 pl-6">
                  В разделе "Документы" нажмите кнопку "Загрузить документ" и заполните необходимые поля.
                </p>
              </div>
              
              <Button variant="outline" className="w-full mt-2">Смотреть все вопросы</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PhoneCall className="mr-2 h-5 w-5 text-primary" />
                Связаться с поддержкой
              </CardTitle>
              <CardDescription>
                Свяжитесь с нами, если у вас возникли вопросы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <Mail className="mt-1 mr-3 h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Email поддержки</h3>
                  <p className="text-sm text-gray-500">support@schoolsystem.ru</p>
                  <p className="text-xs text-gray-400 mt-1">Ответ в течение 24 часов</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <PhoneCall className="mt-1 mr-3 h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Телефон поддержки</h3>
                  <p className="text-sm text-gray-500">+7 (800) 123-45-67</p>
                  <p className="text-xs text-gray-400 mt-1">Пн-Пт с 9:00 до 18:00</p>
                </div>
              </div>
              
              <Button className="w-full mt-4">Написать в поддержку</Button>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Оставить обращение</CardTitle>
            <CardDescription>
              Опишите вашу проблему, и мы постараемся помочь как можно скорее
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email для связи
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Тема обращения
                </label>
                <select
                  id="subject"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Выберите тему</option>
                  <option value="technical">Технические проблемы</option>
                  <option value="account">Проблемы с аккаунтом</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Сообщение
                </label>
                <textarea
                  id="message"
                  rows={5}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Опишите вашу проблему подробно..."
                ></textarea>
              </div>
              
              <Button type="submit" className="w-full md:w-auto">Отправить обращение</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}