import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Heart, Backpack, Skull, Sword, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [gameState, setGameState] = useState(() => {
    const saved = localStorage.getItem('dragones_y_pedrulos_save');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.history && parsed.history.length > 0 && !parsed.is_dead) {
          return {
            hp: parsed.hp || 100,
            inventory: parsed.inventory || [],
            history: parsed.history || [],
            choices: parsed.choices || [],
            is_dead: parsed.is_dead || false,
            atmosphere: parsed.atmosphere || 'neutral',
            loading: false,
            hasSavedGame: parsed
          };
        }
      } catch (e) { /* Error silencioso en producción */ }
    }
    return {
      hp: 100,
      inventory: [],
      history: [],
      choices: [],
      is_dead: false,
      atmosphere: 'neutral',
      loading: false,
      hasSavedGame: null
    };
  });
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  const [customSetting, setCustomSetting] = useState('');

  // Efecto para auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.history, gameState.loading]);

  // Guardar partida automáticamente
  useEffect(() => {
    if (gameState.history.length > 0) {
      if (gameState.is_dead) {
        localStorage.removeItem('dragones_y_pedrulos_save');
      } else {
        const { hasSavedGame, ...stateToSave } = gameState;
        localStorage.setItem('dragones_y_pedrulos_save', JSON.stringify({ ...stateToSave, loading: false }));
      }
    }
  }, [gameState]);

  const startGame = async (setting) => {
    localStorage.removeItem('dragones_y_pedrulos_save');
    setGameState({
      hp: 100,
      inventory: [],
      history: [],
      choices: [],
      is_dead: false,
      atmosphere: 'neutral',
      loading: true,
      hasSavedGame: null
    });
    try {
      const res = await axios.post('/api/start', { setting });
      handleGameResponse(res.data);
    } catch (error) {
      alert("El Oráculo (servidor) no responde.");
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const continueGame = () => {
    if (gameState.hasSavedGame) {
      setGameState({ ...gameState.hasSavedGame, hasSavedGame: null, loading: false });
    }
  };

  const sendAction = async (actionText) => {
    setGameState(prev => ({ 
      ...prev, 
      loading: true, 
      history: [...prev.history, `> ${actionText}`] 
    }));
    
    try {
      const res = await axios.post('/api/action', {
        history: gameState.history, 
        action: actionText,
        currentStats: { hp: gameState.hp, inventory: gameState.inventory }
      });
      handleGameResponse(res.data);
    } catch (error) {
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleGameResponse = (data) => {
    setGameState(prev => {
      let newInventory = [...prev.inventory];
      if (data.inventory_updates) {
        data.inventory_updates.forEach(item => {
          if (item.startsWith('+')) newInventory.push(item.substring(1));
          if (item.startsWith('-')) {
            const itemToRemove = item.substring(1);
            const index = newInventory.indexOf(itemToRemove);
            if (index > -1) newInventory.splice(index, 1);
          }
        });
      }

      const newHp = Math.max(0, Math.min(100, prev.hp + (data.hp_change || 0)));
      const isDead = data.is_dead || newHp <= 0;

      return {
        ...prev,
        hp: newHp,
        inventory: newInventory,
        history: [...prev.history, data.narrative],
        choices: data.choices || [],
        is_dead: isDead,
        atmosphere: data.atmosphere || 'neutral',
        loading: false
      };
    });
  };

  const getBackgroundClass = () => {
    switch (gameState.atmosphere) {
      case 'danger': return 'bg-red-950/30 shadow-[inset_0_0_100px_rgba(255,0,0,0.2)]';
      case 'safe': return 'bg-emerald-950/20 shadow-[inset_0_0_100px_rgba(0,255,0,0.1)]';
      case 'mystery': return 'bg-indigo-950/30 shadow-[inset_0_0_80px_rgba(100,0,255,0.1)]';
      case 'triumph': return 'bg-amber-900/20 shadow-[inset_0_0_100px_rgba(255,215,0,0.2)]';
      default: return 'bg-neutral-900';
    }
  };

  if (gameState.history.length === 0 && !gameState.loading) {
    const presets = [
      { id: 'Medieval Fantástico', icon: '⚔️' },
      { id: 'Cyberpunk', icon: '🦾' },
      { id: 'Actualidad', icon: '🏙️' },
      { id: 'Post-Apocalíptico', icon: '☢️' },
      { id: 'Zombies', icon: '🧟' },
      { id: 'Space Opera', icon: '🚀' },
      { id: 'Terror Lovecraftiano', icon: '🐙' }
    ];

    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center flex-col text-center p-4">
        <h1 className="text-5xl md:text-6xl font-serif text-gray-200 mb-2 tracking-tighter">Dragones & Pedrulos</h1>
        <p className="text-gray-500 mb-10 max-w-md">Elige tu destino y deja que la IA narre tu historia.</p>
        
        {gameState.hasSavedGame && (
          <div className="mb-10 w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-700">
            <button 
              onClick={continueGame}
              className="w-full p-6 bg-amber-950/20 border-2 border-amber-500/50 rounded-xl hover:bg-amber-900/30 hover:border-amber-400 transition-all flex items-center justify-between group"
            >
              <div className="text-left">
                <span className="text-xs uppercase tracking-[0.2em] text-amber-500 font-bold block mb-1">Partida Guardada</span>
                <span className="text-xl text-amber-100 font-serif">Continuar Aventura</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-emerald-500 text-sm font-mono">
                  <Heart size={14} fill="currentColor" /> {gameState.hasSavedGame.hp}%
                </div>
                <div className="text-[10px] text-amber-500/50 uppercase">{gameState.hasSavedGame.history.length} turnos</div>
              </div>
            </button>
            <div className="mt-2 text-[10px] text-gray-600 uppercase tracking-widest">o empieza una nueva abajo</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 w-full max-w-2xl">
          {presets.map(p => (
            <button 
              key={p.id}
              onClick={() => startGame(p.id)}
              className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all flex flex-col items-center gap-2 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{p.icon}</span>
              <span className="text-sm font-medium text-gray-300">{p.id}</span>
            </button>
          ))}
          
          <button 
            onClick={() => startGame('random')}
            className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-lg hover:bg-indigo-900/50 hover:border-indigo-500 transition-all flex flex-col items-center gap-2 group"
          >
            <span className="text-2xl group-hover:rotate-180 transition-transform duration-500">🎲</span>
            <span className="text-sm font-medium text-indigo-200">Aleatorio</span>
          </button>
        </div>

        <div className="w-full max-w-md border-t border-gray-800 pt-6">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">O escribe tu propia ambientación</p>
          <form 
            onSubmit={(e) => { e.preventDefault(); if(customSetting.trim()) startGame(customSetting); }}
            className="flex gap-2"
          >
            <input 
              id="custom-setting"
              name="custom-setting"
              type="text" 
              value={customSetting}
              onChange={(e) => setCustomSetting(e.target.value)}
              placeholder="Ej: Western Espacial con Dinosaurios..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-3 text-white focus:border-white focus:outline-none"
            />
            <button 
              type="submit"
              disabled={!customSetting.trim()}
              className="px-6 bg-white text-black font-bold rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Jugar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col text-gray-200 font-serif transition-colors duration-1000 ${getBackgroundClass()}`}>
      
      <header className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl tracking-tighter text-white/80">D&P</div>
          {gameState.history.length > 0 && (
            <button 
              onClick={() => {
                if(confirm("¿Seguro que quieres empezar de cero? Perderás tu progreso.")) {
                  localStorage.removeItem('dragones_y_pedrulos_save');
                  window.location.reload();
                }
              }}
              className="text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded transition-colors"
            >
              Nueva Partida
            </button>
          )}
        </div>
        <div className="flex gap-6">
          <div className={`flex items-center gap-2 ${gameState.hp < 30 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
            <Heart size={20} fill={gameState.hp < 30 ? "currentColor" : "none"} />
            <span className="font-mono font-bold text-lg">{gameState.hp}%</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400 relative group cursor-help">
            <Backpack size={20} />
            <span className="font-mono text-sm">{gameState.inventory.length}</span>
            <div className="absolute top-8 right-0 w-48 bg-gray-900 border border-white/10 p-2 rounded shadow-xl hidden group-hover:block z-50">
              <h4 className="text-xs text-gray-500 uppercase mb-1">Mochila</h4>
              {gameState.inventory.length === 0 ? <span className="text-xs text-gray-600">Vacía...</span> : 
                gameState.inventory.map((item, i) => <div key={i} className="text-sm text-gray-300">• {item}</div>)}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6 scroll-smooth" ref={scrollRef}>
        {gameState.history.map((text, i) => {
          const isUserAction = text.startsWith('>');
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`${isUserAction ? 'text-gray-500 text-right italic text-sm mt-4 mb-2' : 'text-lg md:text-xl leading-relaxed text-gray-100'}`}
            >
              {text}
            </motion.div>
          )
        })}
        {gameState.loading && (
          <div className="flex gap-2 justify-center py-4 opacity-50">
            <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
          </div>
        )}
        <div className="h-32"></div>
      </main>

      <footer className="p-4 border-t border-white/10 bg-black/60 backdrop-blur-md">
        <div className="max-w-3xl mx-auto space-y-4">
          {!gameState.is_dead ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {gameState.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => sendAction(choice.text)}
                    disabled={gameState.loading}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded hover:bg-white/10 hover:border-white/30 text-left text-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>

              <form 
                onSubmit={(e) => { e.preventDefault(); if(inputText.trim()) { sendAction(inputText); setInputText(''); } }}
                className="relative"
              >
                <input 
                  id="action-input"
                  name="action-input"
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="O escribe tu propia locura..."
                  className="w-full bg-black/50 border border-white/20 rounded pl-4 pr-12 py-3 focus:outline-none focus:border-amber-500 text-white placeholder-gray-600"
                  disabled={gameState.loading}
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim() || gameState.loading}
                  className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <Send size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-1000">
              <div className="flex items-center gap-3 mb-2">
                <Skull size={32} className="text-red-600 animate-pulse" />
                <h2 className="text-2xl font-bold text-red-500">HAS MUERTO</h2>
              </div>
              <p className="text-gray-400 mb-4 text-sm">Tu historia ha terminado.</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-2 bg-red-900/30 border border-red-500/50 text-red-200 rounded hover:bg-red-900/50 transition-all uppercase tracking-widest text-sm font-bold"
              >
                Reencarnar
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;