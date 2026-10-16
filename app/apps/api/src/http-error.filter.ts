import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

/** All errors → `{ error: message }` (API.md). */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private log = new Logger('Error');
  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<FastifyReply>();
    let status = 500;
    let error = 'internal_error';
    let fields: unknown;
    if (e instanceof HttpException) {
      status = e.getStatus();
      const r = e.getResponse();
      const m = typeof r === 'string' ? r : (r as { message?: unknown }).message;
      error = Array.isArray(m) ? m.join('; ') : String(m ?? e.message);
      fields = typeof r === 'object' ? (r as { fields?: unknown }).fields : undefined; // per-field codes (PUT /profile)
    } else if (typeof (e as { statusCode?: unknown })?.statusCode === 'number' && (e as { statusCode: number }).statusCode < 500) {
      status = (e as { statusCode: number }).statusCode; // fastify errors (body too large, bad multipart, ...)
      error = (e as Error).message;
    } else {
      this.log.error(e instanceof Error ? e.stack : String(e));
    }
    void res.status(status).send(fields ? { error, fields } : { error });
  }
}
