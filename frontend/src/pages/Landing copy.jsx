import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';

const Landing = () => {
  const navigate = useNavigate();

  // Function to handle navigation
  const handleGetStarted = () => {
    navigate('/data-upload');
  };

  useEffect(() => {
    // Staggered animation for features
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 * index);
    });

    // Simple testimonial slider
    let currentSlide = 0;
    const testimonialTrack = document.querySelector('.testimonial-track');
    const testimonialSlides = document.querySelectorAll('.testimonial-slide');
    const testimonialDots = document.querySelectorAll('.testimonial-slider button');

    function updateSlider() {
      if (testimonialTrack) {
        testimonialTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        testimonialDots.forEach((dot, index) => {
          if (index === currentSlide) {
            dot.classList.add('bg-indigo-600');
            dot.classList.remove('bg-gray-300');
          } else {
            dot.classList.remove('bg-indigo-600');
            dot.classList.add('bg-gray-300');
          }
        });
      }
    }

    testimonialDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentSlide = index;
        updateSlider();
      });
    });

    // Auto-rotate testimonials
    const intervalId = setInterval(() => {
      if (testimonialDots.length > 0) {
        currentSlide = (currentSlide + 1) % testimonialDots.length;
        updateSlider();
      }
    }, 5000);

    // Animate elements when they come into view
    const animateOnScroll = () => {
      const elements = document.querySelectorAll('.fade-in, .slide-in');

      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;

        if (elementTop < window.innerHeight - elementVisible) {
          element.style.opacity = '1';
          element.style.transform = 'translateX(0)';
        }
      });
    };

    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Run once on page load

    // Cleanup function
    return () => {
      window.removeEventListener('scroll', animateOnScroll);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <style jsx="true">{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');

        :root {
            --primary-color: #4338ca;
            --secondary-color: #6366f1;
            --accent-color: #818cf8;
            --bg-color: #f9fafb;
            --text-color: #1f2937;
        }

        body {
            font-family: 'Inter', sans-serif;
            color: var(--text-color);
            background-color: var(--bg-color);
            overflow-x: hidden;
        }

        /* Animation classes */
        .floating {
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
            100% { transform: translateY(0px); }
        }

        .pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .slide-in {
            animation: slideIn 1s ease-out forwards;
            opacity: 0;
            transform: translateX(-50px);
        }

        @keyframes slideIn {
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .fade-in {
            animation: fadeIn 1.5s ease-out forwards;
            opacity: 0;
        }

        @keyframes fadeIn {
            to {
                opacity: 1;
            }
        }

        .typewriter h1 {
            overflow: hidden;
            border-right: .15em solid var(--primary-color);
            white-space: nowrap;
            margin: 0 auto;
            letter-spacing: .15em;
            animation:
                typing 3.5s steps(40, end),
                blink-caret .75s step-end infinite;
        }

        @keyframes typing {
            from { width: 0 }
            to { width: 100% }
        }

        @keyframes blink-caret {
            from, to { border-color: transparent }
            50% { border-color: var(--primary-color); }
        }

        /* Equation animation */
        .equation-bg {
            position: absolute;
            font-family: 'Courier New', monospace;
            font-size: 1.5rem;
            color: rgba(99, 102, 241, 0.1);
            z-index: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .equation {
            position: absolute;
            animation: scrollEquation 20s linear infinite;
        }

        @keyframes scrollEquation {
            0% { transform: translateY(100%); }
            100% { transform: translateY(-100%); }
        }

        /* Card hover effects */
        .feature-card {
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }

        /* Button styles */
        .btn-primary {
            background-color: var(--primary-color);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-block;
        }

        .btn-primary:hover {
            background-color: var(--secondary-color);
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .btn-secondary {
            background-color: transparent;
            color: var(--primary-color);
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-weight: 600;
            border: 2px solid var(--primary-color);
            transition: all 0.3s ease;
            display: inline-block;
        }

        .btn-secondary:hover {
            background-color: rgba(99, 102, 241, 0.1);
            transform: translateY(-3px);
        }

        /* Custom gradient */
        .gradient-bg {
            background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
        }

        .text-gradient {
            background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* Chart animation */
        .chart-bar {
            animation: growBar 2s ease-out forwards;
            transform-origin: bottom;
            transform: scaleY(0);
        }

        @keyframes growBar {
            to {
                transform: scaleY(1);
            }
        }

        /* Hero wave */
        .wave {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            overflow: hidden;
            line-height: 0;
            transform: rotate(180deg);
        }

        .wave svg {
            position: relative;
            display: block;
            width: calc(100% + 1.3px);
            height: 150px;
        }

        .wave .shape-fill {
            fill: #FFFFFF;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .typewriter h1 {
                white-space: normal;
                animation: none;
                border-right: none;
            }

            .equation-bg {
                display: none;
            }
        }

        /* Navigation bar */
        .nav-link {
            position: relative;
            padding: 0.5rem 0;
            margin: 0 1rem;
            font-weight: 500;
        }

        .nav-link:after {
            content: '';
            position: absolute;
            width: 0;
            height: 2px;
            bottom: 0;
            left: 0;
            background-color: var(--primary-color);
            transition: width 0.3s ease;
        }

        .nav-link:hover:after {
            width: 100%;
        }

        /* Pricing table */
        .pricing-table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            border-radius: 0.5rem;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .pricing-table th,
        .pricing-table td {
            padding: 1rem;
            text-align: center;
            border-bottom: 1px solid #e5e7eb;
        }

        .pricing-table thead th {
            background-color: var(--primary-color);
            color: white;
        }

        .pricing-table tbody tr:nth-child(even) {
            background-color: #f3f4f6;
        }

        .check-icon {
            color: #10b981;
        }

        .x-icon {
            color: #ef4444;
        }

        /* Testimonial slider */
        .testimonial-slider {
            overflow-x: hidden;
            position: relative;
        }

        .testimonial-track {
            display: flex;
            transition: transform 0.5s ease;
        }

        .testimonial-slide {
            flex: 0 0 100%;
        }

        /* Graph animation */
        .graph-line {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: drawLine 3s ease-out forwards;
        }

        @keyframes drawLine {
            to {
                stroke-dashoffset: 0;
            }
        }

        .dot {
            opacity: 0;
            animation: showDot 0.3s ease-out forwards;
            animation-delay: calc(var(--index) * 0.1s + 2s);
        }

        @keyframes showDot {
            to {
                opacity: 1;
            }
        }
      `}</style>

      {/* Navbar */}
      <nav className="fixed w-full bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg shadow-sm z-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16">
      <div className="flex-shrink-0 flex items-center">
        <span className="text-2xl font-bold text-gradient">METIS MMM</span>
      </div>
      <div className="hidden md:flex items-center">
        <div className="flex space-x-8 px-2"> {/* Increased spacing between navigation items */}
          <a href="#features" className="nav-link">Features</a>
          <a href="#advantages" className="nav-link">Advantages</a>
          <a href="#comparison" className="nav-link">Comparison</a>
          <a href="#pricing" className="nav-link">Pricing</a>
        </div>
        <div className="flex space-x-4 ml-6"> {/* Added container for buttons with appropriate spacing */}
          <a href="/sign-in" className="btn-secondary">Login</a>
          <a href="/sign-up" className="btn-primary">Get Started</a>
        </div>
      </div>
      <div className="md:hidden flex items-center">
        <button className="text-gray-600 focus:outline-none">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="equation-bg">
          <div className="equation" style={{ top: "10%", left: "5%" }}>Y = β₀ + β₁X₁ + β₂X₂ + ε</div>
          <div className="equation" style={{ top: "30%", left: "25%" }}>Y = αₓ + βₓ ln(1+X/γₓ)</div>
          <div className="equation" style={{ top: "50%", left: "15%" }}>R² = 1 - Σ(y-ŷ)²/Σ(y-ȳ)²</div>
          <div className="equation" style={{ top: "20%", left: "60%" }}>∂Y/∂X = β(X/γ)^(α-1)/(1+(X/γ)^α)</div>
          <div className="equation" style={{ top: "70%", left: "40%" }}>t = β/SE(β)</div>
          <div className="equation" style={{ top: "40%", left: "75%" }}>X_adstock = X_t + λX_(t-1)</div>
          <div className="equation" style={{ top: "80%", left: "65%" }}>VIF = 1/(1-R²)</div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-32 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="col-span-1">
              <div className="typewriter">
                <h1 className="text-5xl font-bold leading-tight mb-6">Marketing Mix</h1>
              </div>
              <p className="text-xl text-gray-600 mb-8 slide-in" style={{ animationDelay: "0.5s" }}>
                Unlock the power of your marketing data with our advanced MMM platform. Build sophisticated models without coding, analyze ROI, and optimize your marketing spend.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 slide-in" style={{ animationDelay: "1s" }}>
              <button type="button" onClick={handleGetStarted} className="btn-primary">Start Free Trial</button>
                <a href="#features" className="btn-secondary">Explore Features</a>
              </div>
            </div>
            <div className="col-span-1 hidden md:block">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 bg-opacity-10 rounded-lg transform rotate-3"></div>
                <div className="relative bg-white p-6 rounded-lg shadow-xl floating">
                  {/* SVG Graph Animation */}
                  <svg width="100%" height="300" viewBox="0 0 500 300">
                    {/* Grid lines */}
                    <line x1="50" y1="250" x2="450" y2="250" stroke="#E5E7EB" strokeWidth="2" />
                    <line x1="50" y1="50" x2="50" y2="250" stroke="#E5E7EB" strokeWidth="2" />

                    {/* Y-axis labels */}
                    <text x="30" y="250" fontSize="12" textAnchor="end">0</text>
                    <text x="30" y="180" fontSize="12" textAnchor="end">50</text>
                    <text x="30" y="110" fontSize="12" textAnchor="end">100</text>
                    <text x="30" y="40" fontSize="12" textAnchor="end">150</text>

                    {/* X-axis labels */}
                    <text x="50" y="270" fontSize="12" textAnchor="middle">Jan</text>
                    <text x="125" y="270" fontSize="12" textAnchor="middle">Feb</text>
                    <text x="200" y="270" fontSize="12" textAnchor="middle">Mar</text>
                    <text x="275" y="270" fontSize="12" textAnchor="middle">Apr</text>
                    <text x="350" y="270" fontSize="12" textAnchor="middle">May</text>
                    <text x="425" y="270" fontSize="12" textAnchor="middle">Jun</text>

                    {/* Actual line */}
                    <path d="M50,200 L125,180 L200,120 L275,150 L350,100 L425,80"
                          fill="none" stroke="#6366F1" strokeWidth="3" className="graph-line" />

                    {/* Predicted line */}
                    <path d="M50,210 L125,175 L200,130 L275,145 L350,105 L425,85"
                          fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="5,5" className="graph-line" />

                    {/* Data points - Actual */}
                    <circle cx="50" cy="200" r="5" fill="#6366F1" className="dot" style={{ "--index": "0" }} />
                    <circle cx="125" cy="180" r="5" fill="#6366F1" className="dot" style={{ "--index": "1" }} />
                    <circle cx="200" cy="120" r="5" fill="#6366F1" className="dot" style={{ "--index": "2" }} />
                    <circle cx="275" cy="150" r="5" fill="#6366F1" className="dot" style={{ "--index": "3" }} />
                    <circle cx="350" cy="100" r="5" fill="#6366F1" className="dot" style={{ "--index": "4" }} />
                    <circle cx="425" cy="80" r="5" fill="#6366F1" className="dot" style={{ "--index": "5" }} />

                    {/* Data points - Predicted */}
                    <circle cx="50" cy="210" r="5" fill="#10B981" className="dot" style={{ "--index": "6" }} />
                    <circle cx="125" cy="175" r="5" fill="#10B981" className="dot" style={{ "--index": "7" }} />
                    <circle cx="200" cy="130" r="5" fill="#10B981" className="dot" style={{ "--index": "8" }} />
                    <circle cx="275" cy="145" r="5" fill="#10B981" className="dot" style={{ "--index": "9" }} />
                    <circle cx="350" cy="105" r="5" fill="#10B981" className="dot" style={{ "--index": "10" }} />
                    <circle cx="425" cy="85" r="5" fill="#10B981" className="dot" style={{ "--index": "11" }} />

                    {/* Legend */}
                    <rect x="330" y="20" width="12" height="3" fill="#6366F1" />
                    <text x="350" y="23" fontSize="12">Actual</text>

                    <rect x="330" y="40" width="12" height="3" fill="#10B981" />
                    <text x="350" y="43" fontSize="12">Predicted</text>
                  </svg>

                  <div className="flex justify-between items-center mb-3 mt-4">
                    <h3 className="text-lg font-semibold">Marketing Mix Model</h3>
                    <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">R² = 0.92</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                      <span>TV: <span className="font-medium">42%</span></span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
                      <span>Digital: <span className="font-medium">28%</span></span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                      <span>Print: <span className="font-medium">15%</span></span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                      <span>Radio: <span className="font-medium">15%</span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="wave">
          <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="shape-fill"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Powerful Features</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">Our platform offers everything you need to build, test, and optimize marketing mix models.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="feature-card bg-white rounded-xl p-6">
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 mb-4">
                <i className="fas fa-upload text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Data Upload</h3>
              <p className="text-gray-600">Import data from Excel with complete privacy. Nothing is stored online – your data stays on your device.</p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card bg-white rounded-xl p-6">
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 mb-4">
                <i className="fas fa-chart-line text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Variable Workshop</h3>
              <p className="text-gray-600">Transform, split, lag, or create weighted variables. Build S-curves and diminishing returns models without coding.</p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card bg-white rounded-xl p-6">
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 mb-4">
                <i className="fas fa-flask text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Variable Testing</h3>
              <p className="text-gray-600">Test variables before adding them to your model. Preview coefficient changes and statistic improvements.</p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card bg-white rounded-xl p-6">
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 mb-4">
                <i className="fas fa-file-alt text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Model Diagnostics</h3>
              <p className="text-gray-600">Run comprehensive diagnostic tests to validate your model, from multicollinearity to heteroscedasticity tests.</p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card bg-white rounded-xl p-6">
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 mb-4">
                <i className="fas fa-puzzle-piece text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Decomposition Analysis</h3>
              <p className="text-gray-600">Break down model results to see the contribution of each variable or group to your KPI over time.</p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card bg-white rounded-xl p-6">
              <div className="h-12 w-12 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 mb-4">
                <i className="fas fa-download text-xl"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Excel Export</h3>
              <p className="text-gray-600">Export your complete model, including transformations, coefficients, and diagnostics to Excel for sharing.</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a href="#contact" className="btn-primary">See All Features</a>
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section id="advantages" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Why Choose METIS MMM</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">Our platform offers unique advantages over traditional MMM approaches.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="px-6 py-8">
                  <h3 className="text-2xl font-bold mb-4 text-gradient">No Coding Required</h3>
                  <p className="text-gray-600 mb-6">Our intuitive interface allows marketers and analysts to build sophisticated models without writing code.</p>

                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Build S-curves and diminishing returns curves with a simple interface</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Transform variables with built-in functions</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Run diagnostic tests with a single click</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 bg-white rounded-xl shadow-xl overflow-hidden">
                <div className="px-6 py-8">
                  <h3 className="text-2xl font-bold mb-4 text-gradient">Complete Privacy</h3>
                  <p className="text-gray-600 mb-6">Your sensitive marketing data never leaves your device. Perfect for organizations with strict data policies.</p>

                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>No data storage on external servers</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Compliant with strict corporate security policies</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="relative">
              {/* Animated Feature Showcase */}
              <div className="bg-white rounded-xl shadow-xl overflow-hidden p-2">
                {/* Simulated app UI with animation */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-sm font-medium">METIS MMM Dashboard</div>
                  </div>

                  {/* Dashboard simulation */}
                  <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Marketing ROI Dashboard</h4>
                      <div className="flex space-x-2">
                        <div className="h-6 w-6 bg-gray-100 rounded flex items-center justify-center text-xs">
                          <i className="fas fa-sync-alt"></i>
                        </div>
                        <div className="h-6 w-6 bg-gray-100 rounded flex items-center justify-center text-xs">
                          <i className="fas fa-download"></i>
                        </div>
                      </div>
                    </div>

                    {/* ROI Bar Chart */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Channel ROI</div>
                        <div className="text-xs text-gray-500">Last 6 months</div>
                      </div>
                      <div className="flex items-end h-32 space-x-6">
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-full bg-blue-500 rounded-t chart-bar" style={{ height: "80%" }}></div>
                          <div className="text-xs mt-1">TV</div>
                          <div className="text-xs font-medium">$3.2</div>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-full bg-purple-500 rounded-t chart-bar" style={{ height: "90%", animationDelay: "0.2s" }}></div>
                          <div className="text-xs mt-1">Digital</div>
                          <div className="text-xs font-medium">$4.1</div>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-full bg-indigo-500 rounded-t chart-bar" style={{ height: "60%", animationDelay: "0.4s" }}></div>
                          <div className="text-xs mt-1">Social</div>
                          <div className="text-xs font-medium">$2.7</div>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-full bg-green-500 rounded-t chart-bar" style={{ height: "50%", animationDelay: "0.6s" }}></div>
                          <div className="text-xs mt-1">Radio</div>
                          <div className="text-xs font-medium">$2.3</div>
                        </div>
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-full bg-yellow-500 rounded-t chart-bar" style={{ height: "35%", animationDelay: "0.8s" }}></div>
                          <div className="text-xs mt-1">Print</div>
                          <div className="text-xs font-medium">$1.8</div>
                        </div>
                      </div>
                    </div>

                    {/* S-Curve Visualization */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">TV Response Curve</div>
                        <div className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</div>
                      </div>
                      <div className="h-32 w-full bg-gray-50 rounded relative overflow-hidden">
                        {/* S-Curve */}
                        <svg width="100%" height="100%" viewBox="0 0 300 130" preserveAspectRatio="none">
                          <path d="M0,130 C30,130 50,130 70,125 C100,115 120,80 150,50 C180,20 200,10 230,5 C260,0 280,0 300,0"
                                fill="none" stroke="#6366F1" strokeWidth="3" className="graph-line" />

                          {/* Saturation line */}
                          <line x1="0" y1="5" x2="300" y2="5" stroke="#EF4444" strokeWidth="1" strokeDasharray="4" />

                          {/* Current position marker */}
                          <circle cx="180" cy="20" r="5" fill="#6366F1" className="dot" style={{ "--index": "0" }}></circle>
                        </svg>

                        {/* Labels */}
                        <div className="absolute bottom-1 left-2 text-xs text-gray-500">Spend</div>
                        <div className="absolute top-1 left-2 text-xs text-gray-500">Response</div>
                        <div className="absolute top-1 right-2 text-xs text-red-500">Saturation</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How We Compare</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">See how Econometrica stacks up against traditional methods and other platforms.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Features</th>
                  <th>Econometrica</th>
                  <th>Traditional MMM</th>
                  <th>Basic Analytics</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-left font-medium">No-Code Interface</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                  <td><i className="fas fa-check check-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">On-Device Processing</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Variable Transformation</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Advanced S-Curves</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Diagnostic Tests</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Decomposition Analysis</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Data Privacy</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                  <td><i className="fas fa-times x-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Excel Integration</td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-check check-icon"></i></td>
                  <td><i className="fas fa-check check-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Statistical Expertise Required</td>
                  <td><i className="fas fa-times check-icon"></i></td>
                  <td><i className="fas fa-check x-icon"></i></td>
                  <td><i className="fas fa-times check-icon"></i></td>
                </tr>
                <tr>
                  <td className="text-left font-medium">Implementation Time</td>
                  <td>Days</td>
                  <td>Weeks-Months</td>
                  <td>Hours</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">What Our Users Say</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">Join hundreds of companies that use Econometrica for their MMM needs.</p>
          </div>

          <div className="testimonial-slider">
            <div className="testimonial-track flex">
              {/* Testimonial 1 */}
              <div className="testimonial-slide px-4">
                <div className="bg-white rounded-xl shadow-sm p-8">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mr-4">
                      <span className="text-xl font-bold">JD</span>
                    </div>
                    <div>
                      <div className="font-medium">Jane Doe</div>
                      <div className="text-sm text-gray-500">Marketing Director, Tech Co</div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">"Econometrica has transformed how we approach marketing measurement. We went from spending weeks on model development to having insights in days. The interface is intuitive enough for our marketing team while providing the statistical rigor our data scientists expect."</p>
                  <div className="flex text-yellow-400">
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="testimonial-slide px-4 hidden md:block">
                <div className="bg-white rounded-xl shadow-sm p-8">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mr-4">
                      <span className="text-xl font-bold">MS</span>
                    </div>
                    <div>
                      <div className="font-medium">Michael Smith</div>
                      <div className="text-sm text-gray-500">Analytics Lead, Retail Inc</div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">"The privacy features sold us immediately. Our legal team was concerned about sharing marketing data with external vendors, but with Econometrica, all processing happens locally. The capabilities rival what we were getting from consultants at a fraction of the cost."</p>
                  <div className="flex text-yellow-400">
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star"></i>
                    <i className="fas fa-star-half-alt"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8 space-x-2">
              <button className="h-3 w-3 rounded-full bg-indigo-600"></button>
              <button className="h-3 w-3 rounded-full bg-gray-300"></button>
              <button className="h-3 w-3 rounded-full bg-gray-300"></button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
<section id="pricing" className="py-20 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center mb-16">
      <h2 className="text-4xl font-bold mb-3 text-gradient">Subscription Plans</h2>
      <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
        Choose the perfect plan for your marketing analytics needs.
        All plans include unlimited models and our full suite of tools.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Monthly Plan */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="p-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Monthly</h3>
            <span className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full">
              Flexible
            </span>
          </div>
          <div className="mb-6">
            <span className="text-5xl font-bold">$1,500</span>
            <span className="text-xl text-gray-500">/mo</span>
            <p className="text-gray-500 mt-2">Billed monthly</p>
          </div>
          <ul className="mb-8 space-y-4">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Unlimited models</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Complete variable transformations</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Full analytics suite</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Email support</span>
            </li>
          </ul>
          <a
            href="/sign-up?plan=monthly"
            className="block w-full py-3 px-6 text-center text-white font-semibold rounded-lg shadow-md bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>

      {/* Quarterly Plan */}
      <div className="bg-white rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-xl transform scale-105 relative z-10 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute top-0 left-0 right-0 overflow-hidden">
          <div className="bg-indigo-600 text-white py-1 text-center transform rotate-0">
            <span className="text-xs uppercase tracking-wide font-semibold">Most Popular</span>
          </div>
        </div>
        <div className="p-8 pt-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Quarterly</h3>
            <span className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full">
              Save 17%
            </span>
          </div>
          <div className="mb-6">
            <span className="text-5xl font-bold">$1,250</span>
            <span className="text-xl text-gray-500">/mo</span>
            <p className="text-gray-500 mt-2">$3,750 billed every 3 months</p>
          </div>
          <ul className="mb-8 space-y-4">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Unlimited models</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Complete variable transformations</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Full analytics suite</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Priority support</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Advanced customization</span>
            </li>
          </ul>
          <a
            href="/sign-up?plan=quarterly"
            className="block w-full py-3 px-6 text-center text-white font-semibold rounded-lg shadow-md bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>

      {/* Semi-Annual Plan */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="p-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900">Semi-Annual</h3>
            <span className="px-3 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full">
              Save 33%
            </span>
          </div>
          <div className="mb-6">
            <span className="text-5xl font-bold">$1,000</span>
            <span className="text-xl text-gray-500">/mo</span>
            <p className="text-gray-500 mt-2">$6,000 billed every 6 months</p>
          </div>
          <ul className="mb-8 space-y-4">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Unlimited models</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Complete variable transformations</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Full analytics suite</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Dedicated support</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Custom reporting</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Implementation assistance</span>
            </li>
          </ul>
          <a
            href="/sign-up?plan=semiannual"
            className="block w-full py-3 px-6 text-center text-white font-semibold rounded-lg shadow-md bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>

    <div className="mt-16 text-center bg-gray-50 p-8 rounded-xl max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold mb-4">Enterprise Solutions</h3>
      <p className="text-gray-600 mb-6">
        Need a custom solution for your organization? Contact us for tailored pricing and features.
      </p>
      <a
        href="mailto:sales@metis-mmm.com"
        className="inline-flex items-center px-6 py-3 border border-indigo-600 text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        Contact Sales
      </a>
    </div>
  </div>
</section>

      {/* CTA Section */}
      <section id="contact" className="py-16 gradient-bg text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Take Your Marketing Analytics to the Next Level?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">Start your 14-day free trial today. No credit card required.</p>

          <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Email
                </label>
                <input className="appearance-none border border-gray-300 rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" id="email" type="email" placeholder="you@example.com" />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="company">
                  Company
                </label>
                <input className="appearance-none border border-gray-300 rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" id="company" type="text" placeholder="Your Company" />
              </div>
              <div>
              <button type="button" onClick={handleGetStarted} className="btn-primary w-full py-3" style={{ backgroundColor: "var(--primary-color)" }}>
                  Start Free Trial
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">By signing up, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Econometrica</h3>
              <p className="text-gray-400 text-sm">Advanced marketing mix modeling for modern marketing teams.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-400">
              © 2025 Econometrica. All rights reserved.
            </div>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <i className="fab fa-github"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Landing;
