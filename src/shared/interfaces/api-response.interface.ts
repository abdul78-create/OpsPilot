export interface ApiResponse<T> {
  success: true;
  message?: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string | string[];
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
}
