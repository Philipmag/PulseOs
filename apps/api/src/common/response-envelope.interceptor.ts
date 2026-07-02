import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

/**
 * Wraps every successful response in the Phase 4 envelope:
 *   { success: true, data: T, meta?: {...} }
 * Handlers that already return { data, meta } are passed through unwrapped.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, ApiEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === "object" &&
          "data" in payload &&
          "meta" in payload
        ) {
          return { success: true, ...(payload as object) } as ApiEnvelope<T>;
        }
        return { success: true, data: payload };
      }),
    );
  }
}
