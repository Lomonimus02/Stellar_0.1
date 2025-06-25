import { useLocation } from "wouter";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Кастомный хук для SPA-совместимой навигации
 * Предотвращает перезагрузку страницы при навигации и сохраняет кэшированные данные
 */
export function useNavigation() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Навигация назад с использованием SPA роутера
  const goBack = useCallback(() => {
    // Проверяем, есть ли история для возврата
    if (window.history.length > 1) {
      // Используем встроенную функцию браузера
      // wouter автоматически обработает изменение URL без перезагрузки
      window.history.back();
    } else {
      // Если истории нет, переходим на главную страницу
      navigate('/');
    }
  }, [navigate]);

  // Навигация вперед
  const goForward = useCallback(() => {
    // wouter автоматически обработает изменение URL без перезагрузки
    window.history.forward();
  }, []);

  // Программная навигация с заменой текущей записи в истории
  const replace = useCallback((path: string) => {
    navigate(path, { replace: true });
  }, [navigate]);

  // Программная навигация с добавлением новой записи в историю
  const push = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Перезагрузка данных без перезагрузки страницы
  const refresh = useCallback(() => {
    // Инвалидируем все запросы для обновления данных
    queryClient.invalidateQueries();

    // Альтернативно, можно перенавигировать на ту же страницу
    // const currentPath = window.location.pathname + window.location.search;
    // navigate(currentPath, { replace: true });
  }, [queryClient]);

  // Навигация с принудительным обновлением данных
  const pushWithRefresh = useCallback((path: string) => {
    navigate(path);
    // Небольшая задержка для завершения навигации, затем обновляем данные
    setTimeout(() => {
      queryClient.invalidateQueries();
    }, 100);
  }, [navigate, queryClient]);

  return {
    goBack,
    goForward,
    replace,
    push,
    refresh,
    pushWithRefresh,
    navigate
  };
}
