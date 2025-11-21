import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('LoginTokan');
  const excludeUrls = environment.excludeUrls;

  // Check if this request should be skipped
  const shouldSkip = excludeUrls.some(url => req.url.includes(url));

  if (shouldSkip) {
    console.log("⛔ Interceptor skipped for:", req.url);
    return next(req);
  }

  console.log("Interceptor Running:", req.url);

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
