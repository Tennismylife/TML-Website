export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-lg mb-8">The page you are looking for does not exist.</p>
        <a href="/" className="text-blue-400 hover:underline">Go back to home</a>
      </div>
    </div>
  );
}