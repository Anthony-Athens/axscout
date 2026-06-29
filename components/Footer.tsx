export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-600">
      &copy; {new Date().getFullYear()} AXScout. Baseball intelligence powered by data.
    </footer>
  );
}
