import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Lock, Unlock, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConnectionStatusProps {
  className?: string;
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const [isSecure, setIsSecure] = useState<boolean>(window.location.protocol === 'https:');
  const [hostname, setHostname] = useState<string>(window.location.hostname);
  const [port, setPort] = useState<string>(window.location.port);

  useEffect(() => {
    // Обновление статуса при изменении протокола или хоста
    const checkConnection = () => {
      setIsSecure(window.location.protocol === 'https:');
      setHostname(window.location.hostname);
      setPort(window.location.port);
    };

    // Проверяем статус при монтировании и при изменении URL
    checkConnection();
    
    // Обработка события изменения хэша (для SPA приложений)
    window.addEventListener('hashchange', checkConnection);
    
    return () => {
      window.removeEventListener('hashchange', checkConnection);
    };
  }, []);

  // Переключение на HTTPS соединение
  const switchToSecureConnection = () => {
    if (!isSecure) {
      const secureUrl = `https://${hostname}${port ? `:5443` : ''}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.href = secureUrl;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center space-x-2 ${className}`}>
            {isSecure ? (
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 flex items-center gap-1 px-2 py-0.5">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">HTTPS</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 flex items-center gap-1 px-2 py-0.5">
                <Unlock className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">HTTP</span>
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-72 p-3">
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-2">
              {isSecure ? (
                <Shield className="h-4 w-4 text-green-500" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-yellow-500" />
              )}
              <p className="font-medium">
                Статус соединения: <span className={isSecure ? "text-green-600" : "text-yellow-600"}>
                  {isSecure ? "Защищено" : "Не защищено"}
                </span>
              </p>
            </div>
            
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSecure ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <p className="text-sm">Протокол: <span className="font-medium">{isSecure ? 'HTTPS' : 'HTTP'}</span></p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSecure ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className="text-sm">Данные: <span className="font-medium">{isSecure ? 'Зашифрованы' : 'Не зашифрованы'}</span></p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSecure ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <p className="text-sm">Cookies: <span className="font-medium">{isSecure ? 'Защищены' : 'Не защищены'}</span></p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Сервер: {hostname}{port ? `:${port}` : ''}
            </p>
            
            {!isSecure && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-yellow-600 mb-2">
                  <strong>Внимание:</strong> HTTP соединение не является безопасным. Данные передаются в открытом виде.
                </p>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={switchToSecureConnection}>
                  <Lock className="h-3 w-3 mr-1" /> Перейти на защищенное соединение
                </Button>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}