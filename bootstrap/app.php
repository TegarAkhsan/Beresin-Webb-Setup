<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\CheckBlacklist::class,
            \App\Http\Middleware\ForceHttps::class,
        ])
            ->alias([
                'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Illuminate\Http\Exceptions\PostTooLargeException $e, \Illuminate\Http\Request $request) {
            return back()->with('error', 'File terlalu besar. Harap cek kembali ukuran file Anda.');
        });

        $exceptions->respond(function (\Illuminate\Http\Response $response) {
            if ($response->getStatusCode() === 419) {
                return back()->with([
                    'message' => 'The page expired, please try again.',
                ]);
            }

            return $response;
        });

        // Custom Error Pages for Inertia
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            $response = new \Symfony\Component\HttpFoundation\Response();

            // Handle HTTP Exceptions (404, 403, 500, etc.)
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                $status = $e->getStatusCode();
                if (in_array($status, [403, 404, 500, 503])) {
                    return \Inertia\Inertia::render('Error', ['status' => $status])
                        ->toResponse($request)
                        ->setStatusCode($status);
                }
            }

            return null; // Default handling
        });
    })->create();
