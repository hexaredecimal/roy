import { Github, Twitter, MessageCircle } from "lucide-react";

import { Link } from "react-router-dom";

const Footer = () => {
  let year = new Date().getFullYear();
  return (
    <footer className="text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-2xl font-bold mb-4 bg-clip-text text-gradient text-transparent">
              RoyML
            </h3>
            <p className="text-gray-400">
             Functional programming + JS
            </p>
          </div>

          {/* Getting Started */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Getting Started</h4>
            <div className="space-y-2">
              <Link to="/download" className="block text-gray-400 hover:text-white transition-colors">
                Download
              </Link>
              <Link to="/documentation" className="block text-gray-400 hover:text-white transition-colors">
                Documentation
              </Link>
            </div>
          </div>

          {/* Learning */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Learning</h4>
            <div className="space-y-2">
              <a href="https://picasso-releases.fly.dev/book/PiccodeScript.pdf" target="_blank" rel="noopener noreferrer" className="block text-gray-400 hover:text-white transition-colors">
                PiccodeScript Book (PDF)
              </a>
              <Link to="/documentation" className="block text-gray-400 hover:text-white transition-colors">
                Examples
              </Link>
              <Link to="/documentation" className="block text-gray-400 hover:text-white transition-colors">
                Build from Source
              </Link>
            </div>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Community</h4>
            <div className="space-y-2">
              <a href="https://github.com/Glimmr-Lang/PiccodeScript" target="_blank" rel="noopener noreferrer" className="block text-gray-400 hover:text-white transition-colors">
                GitHub
              </a>
              <a href="https://discord.gg/piccode" target="_blank" rel="noopener noreferrer" className="block text-gray-400 hover:text-white transition-colors">
                Discord
              </a>
              <a href="https://twitter.com/piccodescript" target="_blank" rel="noopener noreferrer" className="block text-gray-400 hover:text-white transition-colors">
                Twitter
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-400 text-sm">
            © { year == 2025 ? `${year} `: `${year} - 2025` } PiccodeScript. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


