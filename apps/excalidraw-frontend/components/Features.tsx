import { Zap, Users, Share, Smartphone } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Start sketching instantly. No loading screens, no heavy interfaces."
    },
    {
      icon: Users,
      title: "Real-time Collaboration",
      description: "Work together with your team in real-time. See changes as they happen."
    },
    {
      icon: Share,
      title: "Export Anywhere",
      description: "Export your drawings as PNG, SVG, or share with a simple link."
    },
    {
      icon: Smartphone,
      title: "Works Everywhere",
      description: "Draw on any device. Desktop, tablet, or mobile - it just works."
    }
  ];

  return (
    <section className="py-24 bg-gray-900 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything you need to
            <span className="block text-gray-400">create amazing drawings</span>
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:bg-gray-800/70 transition-all duration-300 hover:transform hover:scale-105">
              <feature.icon className="h-12 w-12 text-white mb-6" />
              <h3 className="text-xl font-semibold text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

