export default function Callout({ children, type = 'info' }: { children: any; type?: 'info' | 'warning' | 'success' }) {
  const color = type === 'warning' ? 'bg-yellow-800' : type === 'success' ? 'bg-green-800' : 'bg-indigo-800';
  return (
    <div className={`${color} p-4 rounded-md text-white my-4`}>
      {children}
    </div>
  );
}
