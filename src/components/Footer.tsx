export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm">CC</span>
            </div>
            <div>
              <div className="text-white font-black text-lg">ChannelChat</div>
              <div className="text-slate-400 text-sm">
                © 2026 Learn from your favorite creators.
              </div>
            </div>
          </div>

          <div className="flex space-x-8 text-sm">
            <a
              href="#"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              Support
            </a>
            <a
              href="#"
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              Blog
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
