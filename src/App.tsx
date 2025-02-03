import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Info, Settings2, Circle, Download } from 'lucide-react';
import { evaluate } from 'mathjs';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [formulaInput, setFormulaInput] = useState('sin(x) + 0.5*sin(3*x)');
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [showFormulaLayout, setShowFormulaLayout] = useState(false); // State to control formula layout visibility
  const [settings, setSettings] = useState({
    radius: 100,
    speed: 1,
    frequency: 12,
    numCircles: 1,
    showCircles: true,
    circleColors: ['#60a5fa'],
    lineColor: '#60a5fa',
    waveColor: '#60a5fa',
    waveform: 'sine'
  });

  const graphPoints = useRef<number[]>([]);
  const timeRef = useRef(0);

  const predefinedFormulas = [
    { name: 'Sine Wave', formula: 'sin(x)' },
    { name: 'Square Wave', formula: 'sin(x) + (1/3)*sin(3*x) + (1/5)*sin(5*x)' },
    { name: 'Triangle Wave', formula: 'sin(x) - (1/9)*sin(3*x) + (1/25)*sin(5*x)' },
    { name: 'Sawtooth Wave', formula: 'sin(x) - (1/2)*sin(2*x) + (1/3)*sin(3*x)' },
    { name: 'Custom Wave', formula: formulaInput }
  ];

  const evaluateFormula = (x: number) => {
    try {
      const result = evaluate(formulaInput, { x });
      setFormulaError(null);
      return result;
    } catch (error) {
      setFormulaError('Invalid formula. Please check your input.');
      return 0;
    }
  };

  const drawCircle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    fill = false
  ) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    if (fill) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.stroke();
    }
  };

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = settings.lineColor;
    ctx.stroke();
  };

  const drawWave = (
    ctx: CanvasRenderingContext2D,
    points: number[],
    centerX: number,
    centerY: number
  ) => {
    ctx.beginPath();
    points.forEach((point, i) => {
      const x = centerX + 150 + i;
      const y = centerY + point;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = settings.waveColor;
    ctx.stroke();
  };

  const getWaveformValue = (n: number, t: number) => {
    switch (settings.waveform) {
      case 'sine':
        return Math.sin(n * t);
      case 'square':
        return Math.sign(Math.sin(n * t));
      case 'triangle':
        return Math.asin(Math.sin(n * t)) * (2 / Math.PI);
      case 'sawtooth':
        return 2 * (t * n / (2 * Math.PI) - Math.floor(0.5 + t * n / (2 * Math.PI)));
      case 'custom':
        return evaluateFormula(n * t);
      default:
        return Math.sin(n * t);
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = 200;
    const centerY = canvas.height / 2;

    let x = 0;
    let y = 0;

    for (let i = 0; i < settings.numCircles; i++) {
      const prevX = x;
      const prevY = y;

      const n = i * 2 + 1;
      const radius = settings.radius * (4 / (n * Math.PI));

      x += radius * Math.cos(n * timeRef.current);
      y += radius * getWaveformValue(n, timeRef.current);

      if (settings.showCircles) {
        const color = settings.circleColors[i] || settings.circleColors[0];
        drawCircle(ctx, centerX + prevX, centerY + prevY, radius, color);
      }
      drawLine(
        ctx,
        centerX + prevX,
        centerY + prevY,
        centerX + x,
        centerY + y
      );

      if (i === settings.numCircles - 1) {
        drawCircle(ctx, centerX + x, centerY + y, 2, settings.lineColor, true);
      }
    }

    graphPoints.current.unshift(y);
    if (graphPoints.current.length > canvas.width) {
      graphPoints.current.pop();
    }

    drawLine(
      ctx,
      centerX + x,
      centerY + y,
      centerX + 150,
      centerY + graphPoints.current[0]
    );

    drawWave(ctx, graphPoints.current, centerX, centerY);

    timeRef.current += 0.01 * settings.frequency * settings.speed;
    
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth - 48;
    canvas.height = 400;

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [settings, formulaInput]);

  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isRunning]);

  const handleSettingChange = (
    key: keyof typeof settings,
    value: number | boolean | string
  ) => {
    if (key === 'numCircles') {
      const numCircles = Math.max(1, Number(value));
      const newColors = Array.from({ length: numCircles }, (_, i) => 
        settings.circleColors[i] || `#${Math.floor(Math.random()*16777215).toString(16)}`
      );
      setSettings(prev => ({ ...prev, numCircles, circleColors: newColors }));
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'fourier-waveform.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const applyFormula = (formula: string) => {
    setFormulaInput(formula);
    setSettings(prev => ({ ...prev, waveform: 'custom' }));
  };

  const toggleFormulaLayout = () => {
    setShowFormulaLayout(!showFormulaLayout);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-700/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Fourier Series Visualization
              </h1>
              <p className="text-gray-400 mt-2">Interactive wave harmonics demonstration</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 group"
                aria-label="Show information"
              >
                <Info className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
              </button>
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  isRunning 
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                }`}
                aria-label={isRunning ? 'Stop animation' : 'Start animation'}
              >
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <button
                onClick={exportImage}
                className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 group"
                aria-label="Export image"
              >
                <Download className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="mb-8 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <h2 className="text-xl font-semibold text-blue-400 mb-2">About This Visualization</h2>
              <p className="text-gray-300 leading-relaxed">
                This interactive visualization demonstrates how Fourier series can approximate complex periodic functions 
                using a sum of simple sine waves. The rotating circles represent different harmonics, 
                and their combined motion traces the resulting waveform. Adjust the parameters below to explore 
                how different combinations create unique wave patterns.
              </p>
            </div>
          )}

          <div className="mb-8">
            <canvas
              ref={canvasRef}
              className="w-full rounded-xl border border-gray-700/50 bg-gray-900/50"
            />
          </div>

          {/* Button to toggle formula layout visibility */}
          <div className="mb-8">
            <button
              onClick={toggleFormulaLayout}
              className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-300"
            >
              {showFormulaLayout ? 'Hide Formula' : 'Use Formula'}
            </button>
          </div>

          {/* Formula Input Section (hidden by default) */}
          {showFormulaLayout && (
            <>
              <div className="mb-8 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <h2 className="text-xl font-semibold text-blue-400 mb-4">Custom Formula</h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    value={formulaInput}
                    onChange={(e) => setFormulaInput(e.target.value)}
                    placeholder="Enter a formula (e.g., sin(x) + 0.5*sin(3*x))"
                    className="w-full px-4 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, waveform: 'custom' }))}
                    className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-300"
                  >
                    Apply Formula
                  </button>
                </div>
                {formulaError && (
                  <p className="text-red-400 mt-2">{formulaError}</p>
                )}
              </div>

              <div className="mb-8 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <h2 className="text-xl font-semibold text-blue-400 mb-4">Predefined Formulas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {predefinedFormulas.map((formula, index) => (
                    <button
                      key={index}
                      onClick={() => applyFormula(formula.formula)}
                      className="p-4 bg-gray-700/30 hover:bg-gray-700/50 rounded-xl transition-all duration-300 text-left"
                    >
                      <h3 className="text-lg font-semibold text-blue-400">{formula.name}</h3>
                      <p className="text-gray-300">{formula.formula}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Settings Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-700/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Radius: {settings.radius}
                </label>
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.radius}
                onChange={(e) => handleSettingChange('radius', Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="bg-gray-700/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Speed: {settings.speed}x
                </label>
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.speed}
                onChange={(e) => handleSettingChange('speed', Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="bg-gray-700/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Frequency: {settings.frequency}
                </label>
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={settings.frequency}
                onChange={(e) => handleSettingChange('frequency', Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="bg-gray-700/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Number of Sine Waves
                </label>
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.numCircles}
                onChange={(e) => handleSettingChange('numCircles', Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-gray-700/30 p-4 rounded-xl flex items-center space-x-3">
              <Circle className="w-5 h-5 text-blue-400" />
              <label className="text-sm font-medium text-gray-300">Show Circles</label>
              <div className="flex-grow"></div>
              <input
                type="checkbox"
                checked={settings.showCircles}
                onChange={(e) => handleSettingChange('showCircles', e.target.checked)}
                className="w-5 h-5 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
              />
            </div>

            <div className="bg-gray-700/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Waveform
                </label>
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <select
                value={settings.waveform}
                onChange={(e) => handleSettingChange('waveform', e.target.value)}
                className="w-full px-3 py-2 bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="bg-gray-700/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Line Color
                </label>
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <input
                type="color"
                value={settings.lineColor}
                onChange={(e) => handleSettingChange('lineColor', e.target.value)}
                className="w-full h-10 bg-gray-600 rounded-lg cursor-pointer"
              />
            </div>

            <div className="bg-gray-700/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Wave Color
                </label>
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <input
                type="color"
                value={settings.waveColor}
                onChange={(e) => handleSettingChange('waveColor', e.target.value)}
                className="w-full h-10 bg-gray-600 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;