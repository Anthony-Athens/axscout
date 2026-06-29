export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-6 text-center text-sm text-slate-400">
      &copy; {new Date().getFullYear()} AXScout. Baseball intelligence powered by data.
    </footer>
  );
}
