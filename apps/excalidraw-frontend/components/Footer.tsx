import { PenTool } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-800 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center">
          <div className="flex items-center space-x-2 mb-6 md:mb-0">
            <PenTool className="h-6 w-6 text-white" />
            <span className="text-xl font-bold text-white">Excalidraw</span>
          </div>
          
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500">
          <p>Made by Abhinav</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;