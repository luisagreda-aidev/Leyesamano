import React, { useState, useRef, useEffect } from 'react';
import { ScaleIcon, SearchIcon, SendIcon, DownloadIcon } from './components/Icons';
import { Disclaimer } from './components/Disclaimer';
import { ChatMessage } from './components/ChatMessage';
import { searchLegalInfo } from './services/geminiService';
import { ChatMessage as ChatMessageType, SearchState } from './types';

const COUNTRIES = [
  "Argentina", "Bolivia", "Chile", "Colombia", "Costa Rica", "Cuba",
  "Ecuador", "El Salvador", "España", "Estados Unidos", "Guatemala",
  "Honduras", "México", "Nicaragua", "Panamá", "Paraguay",
  "Perú", "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela"
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    hasSearched: false,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, searchState.isLoading]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || searchState.isLoading) return;

    const query = inputValue.trim();
    setInputValue('');
    
    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setSearchState({ isLoading: true, error: null, hasSearched: true });

    try {
      // Call Gemini Service with context
      const response = await searchLegalInfo(query, selectedCountry, selectedState);
      
      const aiMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        sources: response.sources,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setSearchState(prev => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      setSearchState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || "Ocurrió un error inesperado."
      }));
    }
  };

  const handleDownloadPDF = () => {
    if (typeof window === 'undefined') return;
    
    // @ts-ignore
    if (!window.html2pdf) {
      alert("Error: Librería de PDF no cargada.");
      return;
    }

    const element = document.getElementById('chat-history');
    if (!element) {
        alert("No hay contenido para descargar.");
        return;
    }

    // Force style to ensure PDF isn't blank due to dark mode text or transparency
    const originalBg = element.style.backgroundColor;
    element.style.backgroundColor = '#ffffff';

    const opt = {
      margin: [10, 10],
      filename: `Leyesamano-Consulta-${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff' // Ensure white background in canvas
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => {
        // Restore style
        element.style.backgroundColor = originalBg;
    });
  };

  const suggestions = [
    "Derechos de inquilino sin contrato",
    "Reclamar deuda pendiente",
    "Despido injustificado",
    "Derechos de autor en internet"
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className={`bg-white border-b border-slate-200 sticky top-0 z-10 transition-all duration-300 ${searchState.hasSearched ? 'py-3' : 'py-5'}`}>
        <div className="max-w-5xl mx-auto px-4 w-full flex items-center justify-between">
            <div 
              className="flex flex-col cursor-pointer group" 
              onClick={() => {
                setSearchState({ hasSearched: false, isLoading: false, error: null });
                setMessages([]);
                setInputValue('');
              }}
            >
              <div className="flex items-center gap-2">
                <div className="bg-slate-900 text-white p-1.5 rounded-lg group-hover:bg-indigo-600 transition-colors">
                  <ScaleIcon className="w-6 h-6" />
                </div>
                <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 tracking-tight">
                  Leyes<span className="text-indigo-600">amano</span>
                </h1>
              </div>
              <span className="text-[10px] text-slate-500 font-medium ml-10 mt-[-2px]">
                by Luis Agreda - AI Software Architect
              </span>
            </div>
            
            {searchState.hasSearched && (
               <div className="flex items-center gap-4">
                 <button 
                    onClick={handleDownloadPDF}
                    className="hidden md:flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium"
                    title="Descargar historial en PDF"
                 >
                    <DownloadIcon className="w-5 h-5" />
                    <span className="hidden lg:inline">Descargar PDF</span>
                 </button>
                 <div className="hidden md:flex flex-col items-end">
                    <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      {selectedCountry ? `Jurisdicción: ${selectedCountry}` : 'Búsqueda Global'}
                      {selectedState && `, ${selectedState}`}
                    </div>
                 </div>
               </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center w-full max-w-5xl mx-auto px-4 relative">
        
        {/* Initial View - Search Engine Style */}
        {!searchState.hasSearched ? (
          <div className="flex flex-col items-center justify-center w-full flex-grow py-12 md:py-0">
            <div className="w-full max-w-2xl text-center space-y-8 animate-fade-in-up">
              
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900">
                  Justicia a tu alcance <br/><span className="text-indigo-600 italic">Leyesamano</span>
                </h2>
                <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
                  Tu asistente personal potenciado por IA para encontrar y entender leyes en tu país y estado.
                </p>
              </div>

              <div className="w-full bg-white p-2 rounded-3xl shadow-lg border border-slate-200">
                {/* Location Selectors */}
                <div className="flex flex-col sm:flex-row gap-2 p-2 border-b sm:border-b-0 sm:border-r border-slate-100 mb-2 sm:mb-0">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 text-left px-2">PAÍS</label>
                    <select 
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none"
                    >
                      <option value="">Seleccionar País...</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1 text-left px-2">ESTADO / PROVINCIA</label>
                    <input 
                      type="text"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      placeholder="Ej. Madrid, CDMX..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none"
                    />
                  </div>
                </div>

                {/* Main Search */}
                <form onSubmit={handleSearch} className="relative group p-2">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <SearchIcon className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Describe tu problema legal o pregunta..."
                    className="w-full py-4 pl-12 pr-14 bg-white hover:bg-slate-50 focus:bg-white rounded-xl text-lg outline-none transition-all placeholder:text-slate-400"
                    autoFocus
                  />
                  <button 
                    type="button" 
                    onClick={(e) => handleSearch(e)}
                    className="absolute right-3 top-3 bottom-3 aspect-square bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-md"
                    disabled={!inputValue.trim()}
                  >
                    <SendIcon className="w-5 h-5" />
                  </button>
                </form>
              </div>

              <div className="pt-4">
                <p className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Búsquedas frecuentes</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputValue(s);
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="max-w-lg mx-auto">
                 <Disclaimer />
              </div>
            </div>
          </div>
        ) : (
          /* Results View - Chat Style */
          <div className="w-full max-w-4xl flex flex-col h-full py-8">
            {/* Added a wrapper div with white background for PDF capture */}
            <div className="flex-grow mb-24 p-4 bg-white rounded-xl" id="chat-history">
              <Disclaimer />
              
              {/* Context Badge in Chat */}
              {(selectedCountry || selectedState) && (
                <div className="flex justify-center mb-6">
                  <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-sm">
                    <ScaleIcon className="w-4 h-4" />
                    <span>
                      Contexto: <strong>{selectedCountry || 'Global'}</strong> 
                      {selectedState && <span> • {selectedState}</span>}
                    </span>
                  </div>
                </div>
              )}
              
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {searchState.isLoading && (
                <div className="flex justify-start w-full mb-6 animate-pulse">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none p-6 shadow-sm flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-slate-500 text-sm font-medium">Investigando leyes en {selectedCountry || 'fuentes globales'}...</span>
                  </div>
                </div>
              )}

              {searchState.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-center">
                  {searchState.error}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Sticky Input Area for follow-up */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-10 pb-6 px-4">
              <div className="max-w-4xl mx-auto">
                 <form onSubmit={handleSearch} className="relative shadow-2xl rounded-2xl">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Haz una pregunta de seguimiento..."
                      className="w-full py-4 pl-6 pr-14 bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl text-base outline-none transition-all placeholder:text-slate-400"
                      disabled={searchState.isLoading}
                    />
                    <button 
                      type="submit"
                      disabled={!inputValue.trim() || searchState.isLoading}
                      className="absolute right-2 top-2 bottom-2 aspect-square bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-colors"
                    >
                      <SendIcon className="w-5 h-5" />
                    </button>
                 </form>
                 <p className="text-center text-[10px] text-slate-400 mt-2">
                   Leyesamano puede cometer errores. Verifica la información importante.
                 </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;