import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, X, Send, ChevronDown, Paperclip, User, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Интерфейс для сообщения чата
interface ChatMessage {
  id: number;
  sender: 'user' | 'support';
  message: string;
  timestamp: Date;
  read: boolean;
}

export function SupportChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'support',
      message: 'Здравствуйте! Чем мы можем вам помочь сегодня?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 минут назад
      read: true
    }
  ]);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Статус оператора меняется случайным образом для демонстрации
  useEffect(() => {
    const timer = setInterval(() => {
      setIsOnline(Math.random() > 0.3); // 70% вероятность, что оператор онлайн
    }, 60000); // Проверка каждую минуту
    
    return () => clearInterval(timer);
  }, []);

  // Автоматический скролл вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Добавляем сообщение пользователя
    const newMessage: ChatMessage = {
      id: messages.length + 1,
      sender: 'user',
      message: message.trim(),
      timestamp: new Date(),
      read: false
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");
    
    // Имитация ответа от поддержки через 1-3 секунды
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      const supportResponses = [
        "Спасибо за обращение! Ваш запрос обрабатывается специалистом.",
        "Уточните, пожалуйста, дополнительные детали вашего вопроса.",
        "Мы проверим информацию и вернемся к вам в ближайшее время.",
        "Не могли бы вы предоставить номер или идентификатор, о котором идет речь?",
        "Для решения этого вопроса нам понадобится немного времени. Мы свяжемся с вами в ближайшее время."
      ];
      
      const randomResponse = supportResponses[Math.floor(Math.random() * supportResponses.length)];
      
      const supportReply: ChatMessage = {
        id: messages.length + 2,
        sender: 'support',
        message: randomResponse,
        timestamp: new Date(),
        read: false
      };
      
      setMessages(msgs => [...msgs, supportReply]);
    }, delay);
  };

  const handleFileAttach = () => {
    toast({
      title: "Функция в разработке",
      description: "Вложение файлов будет доступно в ближайшем обновлении.",
    });
  };

  // Кнопка чата в правом нижнем углу экрана
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          onClick={toggleChat} 
          className="rounded-full w-14 h-14 shadow-lg"
          data-support-chat-button
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`w-80 md:w-96 shadow-lg transition-all duration-300 ${isMinimized ? 'h-auto' : 'h-[500px] max-h-[80vh]'}`}>
        <CardHeader className="px-4 py-2 flex flex-row items-center justify-between space-y-0 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle className="text-base">Чат с поддержкой</CardTitle>
            <Badge 
              variant={isOnline ? "default" : "secondary"} 
              className={`ml-2 h-5 px-1.5 ${isOnline ? 'bg-green-500 hover:bg-green-500' : ''}`}
            >
              {isOnline ? "Онлайн" : "Оффлайн"}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary/80"
              onClick={toggleChat}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary/80"
              onClick={closeChat}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <>
            <CardContent className="p-0 flex flex-col h-[calc(100%-106px)]">
              <ScrollArea className="flex-1 px-4 py-2">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] px-3 py-2 rounded-lg ${
                          msg.sender === 'user' 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender === 'support' && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">СП</AvatarFallback>
                            </Avatar>
                          )}
                          <span className="text-xs font-medium">
                            {msg.sender === 'user' ? user?.firstName || 'Вы' : 'Поддержка'}
                          </span>
                          <span className="text-xs opacity-70 ml-auto flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(msg.timestamp, 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="border-t p-3">
              <div className="flex items-center w-full gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full shrink-0"
                  onClick={handleFileAttach}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input 
                  placeholder="Введите сообщение..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="h-8 text-sm"
                />
                <Button 
                  size="icon" 
                  className="h-8 w-8 rounded-full shrink-0"
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}