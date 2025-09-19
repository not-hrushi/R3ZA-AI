import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-3xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-lg text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">
            Go Back Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
