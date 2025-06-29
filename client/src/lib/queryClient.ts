import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown | undefined,
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  };

  // Add cache control for GET requests
  if (method === "GET") {
    options.cache = 'no-store';
  }

  const res = await fetch(url, options); // Use updated options

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Первый элемент - URL, второй - параметры (опционально)
    const url = queryKey[0] as string;
    const params = queryKey[1] as Record<string, any> | undefined;
    
    // Если есть параметры запроса, добавляем их к URL
    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      
      const searchParamsString = searchParams.toString();
      if (searchParamsString) {
        finalUrl = `${url}?${searchParamsString}`;
      }
    }
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    finalUrl = finalUrl.includes('?') 
      ? `${finalUrl}&_t=${timestamp}` 
      : `${finalUrl}?_t=${timestamp}`;
    
    const res = await fetch(finalUrl, {
      credentials: "include",
      cache: 'no-store',
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
