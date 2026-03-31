import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { cn } from './lib/utils';
import Home from './pages/Home';
import History from './pages/History';

function TopBar() {
  const { pathname } = useLocation();

  const navItems = [
    { to: '/', label: 'Forecast' },
    { to: '/history', label: 'History' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl px-4 sm:px-6 py-4 flex justify-between items-center border-b border-white/30">
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/40 shadow-sm">
          <img src="/figures/productmanagerinterview_logo_nobg.png" alt="PM Accelerator" className="w-full h-full object-cover" />
        </div>
        <h1 className="font-headline font-black italic tracking-tighter text-xl text-primary hidden sm:block">
          PMA Weather
        </h1>
      </Link>

      <nav className="flex items-center gap-1">
        {navItems.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'text-sm font-semibold px-4 py-2 rounded-full transition-colors no-underline',
              pathname === to
                ? 'bg-primary-container text-white shadow-sm'
                : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="w-full bg-white/60 backdrop-blur-2xl border-t border-white/30 mt-12 py-10 px-6 sm:px-12">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md">
               <img src="/figures/productmanagerinterview_logo_nobg.png" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <span className="font-headline font-black italic tracking-tighter text-lg text-primary">
                PMA Weather
             </span>
          </div>
          <div className="text-xs leading-relaxed text-on-surface-variant max-w-xl flex flex-col gap-3">
            <p>
              The Product Manager Accelerator Program is designed to support PM professionals through every stage of their careers. From students looking for entry-level jobs to Directors looking to take on a leadership role, our program has helped over hundreds of students fulfill their career aspirations.
            </p>
            <p>
              Our Product Manager Accelerator community are ambitious and committed. Through our program they have learnt, honed and developed new PM and leadership skills, giving them a strong foundation for their future endeavors.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:items-end md:text-right">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant opacity-60">Developer</span>
            <span className="text-lg font-headline font-black text-on-surface">Lucas Pereira Nunes</span>
          </div>
        </div>
      </div>
      

    </footer>
  );
}

function Layout() {
  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-6 w-full min-h-[70vh]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>

      <AppFooter />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
