import Features from '@/components/Features';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Hero } from '@/components/Hero';


function App() {
  return (
    <div className="relative bg-gray-800">
      <Header/>
      <Hero/>
      <Features/>
      <Footer/>
    </div>
  );
}

export default App;