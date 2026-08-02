import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse } from '@shared/interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.url;

    return next.handle().pipe(
      map((responseContent) => {
        let message = 'Operation successful';
        let data = responseContent;

        if (
          responseContent &&
          typeof responseContent === 'object' &&
          'message' in responseContent &&
          'data' in responseContent
        ) {
          message = responseContent.message;
          data = responseContent.data;
        }

        return {
          success: true,
          message,
          data,
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }
}
