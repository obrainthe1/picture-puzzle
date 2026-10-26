import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Grip,
  ImagePlus,
  Lightbulb,
  MousePointer2,
  PartyPopper,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

type Phase = 'upload' | 'active' | 'solved';
type Difficulty = 'easy' | 'medium' | 'hard';

type ImageSource = {
  url: string;
  name: string;
  width: number;
  height: number;
};

const DIFFICULTIES: Array<{
  id: Difficulty;
  label: string;
  subtitle: string;
  cells: number;
}> = [
  { id: 'easy', label: 'Easy', subtitle: '3 × 3 · 9 pieces', cells: 3 },
  { id: 'medium', label: 'Medium', subtitle: '4 × 4 · 16 pieces', cells: 4 },
  { id: 'hard', label: 'Hard', subtitle: '5 × 5 · 25 pieces', cells: 5 },
];

const SAMPLE_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <rect width="1200" height="900" fill="#f48662"/>
    <circle cx="914" cy="212" r="130" fill="#f7dc76"/>
    <circle cx="914" cy="212" r="94" fill="#ffe9a7"/>
    <path d="M0 590 C150 474 270 500 390 594 C530 705 624 515 782 552 C932 587 1017 497 1200 400 L1200 900 L0 900Z" fill="#0d877d"/>
    <path d="M0 692 C170 631 321 688 439 745 C556 801 707 660 835 680 C982 702 1075 628 1200 591 L1200 900 L0 900Z" fill="#183f5c"/>
    <path d="M590 900 C640 785 650 696 605 622 C570 564 512 522 464 484 C550 493 654 530 720 605 C778 672 774 771 737 900Z" fill="#f7dc76"/>
    <path d="M101 181 C185 125 282 145 337 216 C270 204 226 232 197 281 C158 247 127 220 101 181Z" fill="#183f5c" opacity=".85"/>
    <circle cx="250" cy="630" r="24" fill="#f7dc76"/><circle cx="301" cy="595" r="12" fill="#f7dc76"/>
  </svg>`);

function shufflePieces(count: number) {
  const pieces = Array.from({ length: count }, (_, index) => index);
  do {
    for (let index = pieces.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [pieces[index], pieces[swapIndex]] = [pieces[swapIndex], pieces[index]];
    }
  } while (pieces.every((piece, index) => piece === index));
  return pieces;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function Home() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [image, setImage] = useState<ImageSource | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [draggedTile, setDraggedTile] = useState<number | null>(null);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedDifficulty = useMemo(
    () => DIFFICULTIES.find((item) => item.id === difficulty) ?? DIFFICULTIES[0],
    [difficulty],
  );
  const gridSize = selectedDifficulty.cells;
  useEffect(() => {
    if (phase !== 'active') return;
    const timer = window.setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(
    () => () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (image?.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  const clearHint = () => {
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setHintIndex(null);
  };

  const readImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('That file is not an image. Try a JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('That image is over 20 MB. Choose a smaller photo.');
      return;
    }
    setUploadError('');
    const url = URL.createObjectURL(file);
    const probe = new window.Image();
    probe.onload = () => {
      if (image?.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
      setImage({
        url,
        name: file.name,
        width: probe.naturalWidth || 1200,
        height: probe.naturalHeight || 900,
      });
      setPhase('upload');
      setTiles([]);
      setMoves(0);
      setElapsed(0);
      clearHint();
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      setUploadError('We could not read that image. Try another photo.');
    };
    probe.src = url;
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) readImage(file);
    event.target.value = '';
  };

  const loadSample = () => {
    if (image?.url.startsWith('blob:')) URL.revokeObjectURL(image.url);
    setImage({ url: SAMPLE_IMAGE, name: 'sunny-afternoon.svg', width: 1200, height: 900 });
    setUploadError('');
    setPhase('upload');
    setTiles([]);
    setMoves(0);
    setElapsed(0);
    clearHint();
  };

  const startPuzzle = () => {
    setTiles(shufflePieces(gridSize * gridSize));
    setMoves(0);
    setElapsed(0);
    setSelectedTile(null);
    clearHint();
    setPhase('active');
  };

  const resetToUpload = () => {
    clearHint();
    setPhase('upload');
    setTiles([]);
    setSelectedTile(null);
    setMoves(0);
    setElapsed(0);
  };

  const swapTiles = (firstIndex: number, secondIndex: number) => {
    if (firstIndex === secondIndex || phase !== 'active') return;
    const nextTiles = [...tiles];
    [nextTiles[firstIndex], nextTiles[secondIndex]] = [
      nextTiles[secondIndex],
      nextTiles[firstIndex],
    ];
    setTiles(nextTiles);
    setMoves((count) => count + 1);
    setSelectedTile(null);
    if (nextTiles.every((piece, index) => piece === index)) {
      setPhase('solved');
      clearHint();
    }
  };

  const handleTileClick = (index: number) => {
    if (phase !== 'active') return;
    if (selectedTile === null) {
      setSelectedTile(index);
      return;
    }
    swapTiles(selectedTile, index);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedTile !== null) swapTiles(draggedTile, targetIndex);
    setDraggedTile(null);
  };

  const showHint = () => {
    if (phase !== 'active') return;
    const firstWrong = tiles.findIndex((piece, index) => piece !== index);
    if (firstWrong === -1) return;
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setHintIndex(firstWrong);
    hintTimeoutRef.current = setTimeout(() => setHintIndex(null), 3600);
  };

  const shareResult = async () => {
    const result = `I solved my ${selectedDifficulty.label.toLowerCase()} picture puzzle in ${moves} moves and ${formatTime(elapsed)}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Picture Puzzle', text: result });
      } else {
        await navigator.clipboard.writeText(result);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      // Sharing can be dismissed; no error state is needed for this local action.
    }
  };

  const tileStyle = (piece: number) => {
    const pieceRow = Math.floor(piece / gridSize);
    const pieceColumn = piece % gridSize;
    const positionX = (pieceColumn / (gridSize - 1)) * 100;
    const positionY = (pieceRow / (gridSize - 1)) * 100;
    return {
      backgroundImage: `url(${image?.url})`,
      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
      backgroundPosition: `${positionX}% ${positionY}%`,
    };
  };

  return (
    <main className="puzzle-app">
      <div className="sun-orb sun-orb-one" />
      <div className="sun-orb sun-orb-two" />
      <header className="app-header">
        <button
          className="brand-lockup"
          onClick={resetToUpload}
          data-testid="button-brand-home"
          type="button"
          aria-label="Return to new puzzle"
        >
          <span className="brand-mark">
            <Sparkles size={17} strokeWidth={2.5} />
          </span>
          <span>
            <strong>Piece by piece</strong>
            <small>picture puzzle</small>
          </span>
        </button>
        {phase !== 'upload' && (
          <button
            className="header-new-button"
            onClick={resetToUpload}
            data-testid="button-new-puzzle"
            type="button"
          >
            <ImagePlus size={16} />
            New puzzle
          </button>
        )}
      </header>

      {phase === 'upload' && (
        <section className="upload-view page-enter" aria-labelledby="upload-title">
          <div className="upload-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> A small challenge for a favorite moment</div>
            <h1 id="upload-title">Make a puzzle<br /><em>out of it.</em></h1>
            <p className="intro-copy">
              Turn a photo from your camera roll into a pocket-sized brain break.
              Pick your pace, then find the picture hiding in plain sight.
            </p>
            <div className="feature-notes">
              <span><Check size={14} /> Just your browser</span>
              <span><Check size={14} /> Nothing leaves your device</span>
            </div>
          </div>

          <div className="upload-column">
            <div
              className={`upload-card ${isDraggingFile ? 'is-dragging' : ''} ${image ? 'has-image' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingFile(false);
                const file = event.dataTransfer.files[0];
                if (file) readImage(file);
              }}
              data-testid="dropzone-image-upload"
            >
              {image ? (
                <>
                  <div className="preview-image-wrap">
                    <img src={image.url} alt="Selected puzzle preview" data-testid="img-selected-preview" />
                    <button
                      className="remove-image-button"
                      onClick={() => { if (image.url.startsWith('blob:')) URL.revokeObjectURL(image.url); setImage(null); }}
                      data-testid="button-remove-image"
                      type="button"
                      aria-label="Remove selected image"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="selected-image-meta">
                    <div>
                      <strong data-testid="text-selected-image">{image.name}</strong>
                      <span>{image.width} × {image.height} px</span>
                    </div>
                    <button
                      className="text-action"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-change-image"
                      type="button"
                    >
                      Change
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="upload-prompt"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-image"
                  type="button"
                >
                  <span className="upload-icon"><Upload size={22} /></span>
                  <span className="upload-prompt-title">Drop a photo here</span>
                  <span className="upload-prompt-subtitle">or browse your device</span>
                  <span className="upload-file-types">JPG, PNG, WEBP · max 20 MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                data-testid="input-image-file"
              />
            </div>
            {uploadError && (
              <p className="upload-error" role="alert" data-testid="status-upload-error">
                {uploadError}
              </p>
            )}

            <div className="sample-row">
              <span>Not ready to share a photo?</span>
              <button onClick={loadSample} data-testid="button-try-sample" type="button">
                Try the sunny sample <ChevronRight size={14} />
              </button>
            </div>

            <div className={`setup-panel ${image ? 'setup-ready' : ''}`}>
              <div className="setup-heading">
                <span className="section-kicker">01 / Set the feeling</span>
                <span className="piece-count">{image ? 'Ready to play' : 'Choose a photo first'}</span>
              </div>
              <div className="difficulty-grid" role="radiogroup" aria-label="Puzzle difficulty">
                {DIFFICULTIES.map((item) => (
                  <button
                    key={item.id}
                    className={`difficulty-option ${difficulty === item.id ? 'is-selected' : ''}`}
                    onClick={() => setDifficulty(item.id)}
                    data-testid={`button-difficulty-${item.id}`}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === item.id}
                  >
                    <span className="difficulty-radio">{difficulty === item.id && <span />}</span>
                    <span><strong>{item.label}</strong><small>{item.subtitle}</small></span>
                  </button>
                ))}
              </div>
              <button
                className="primary-cta"
                onClick={startPuzzle}
                disabled={!image}
                data-testid="button-start-puzzle"
                type="button"
              >
                <Play size={17} fill="currentColor" />
                Start the puzzle
                <span className="cta-arrow"><ChevronRight size={17} /></span>
              </button>
            </div>
          </div>
        </section>
      )}

      {(phase === 'active' || phase === 'solved') && image && (
        <section className={`game-view page-enter ${phase === 'solved' ? 'is-solved' : ''}`} aria-labelledby="game-title">
          <div className="game-intro-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> {phase === 'solved' ? 'A picture found' : 'Your puzzle is ready'}</div>
              <h1 id="game-title">{phase === 'solved' ? 'Nicely put together.' : 'Find the picture.'}</h1>
              <p>{phase === 'solved' ? 'A few patient swaps and the whole story came back into focus.' : 'Drag a piece onto another to swap them. On a phone? Tap two pieces instead.'}</p>
            </div>
            <div className="image-chip">
              <img src={image.url} alt="" />
              <span><strong>{image.name}</strong><small>{selectedDifficulty.label} · {gridSize * gridSize} pieces</small></span>
            </div>
          </div>

          <div className="game-layout">
            <div className="board-column">
              <div className={`board-frame ${selectedTile !== null ? 'has-selection' : ''}`}>
                <div
                  className="puzzle-board"
                  style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, gridAutoRows: '1fr', aspectRatio: `${image.width} / ${image.height}` }}
                  data-testid="puzzle-board"
                  aria-label={`${selectedDifficulty.label} puzzle board`}
                >
                  {tiles.map((piece, index) => (
                    <button
                      key={`${piece}-${index}`}
                      className={`puzzle-tile ${selectedTile === index ? 'is-selected' : ''} ${hintIndex === index ? 'is-hint' : ''} ${draggedTile === index ? 'is-dragged' : ''}`}
                      style={tileStyle(piece)}
                      draggable={phase === 'active'}
                      onClick={() => handleTileClick(index)}
                      onDragStart={() => setDraggedTile(index)}
                      onDragEnd={() => setDraggedTile(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(index)}
                      data-testid={`tile-${index}`}
                      type="button"
                      aria-label={`Puzzle piece ${index + 1}${selectedTile === index ? ', selected' : ''}`}
                    >
                      <span className="tile-number">{index + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="board-caption">
                <span><Grip size={15} /> {phase === 'solved' ? 'Every piece found its place' : 'Drag to swap · tap to select'}</span>
                <span className="caption-difficulty">{selectedDifficulty.label} · {gridSize} × {gridSize}</span>
              </div>
            </div>

            <aside className="game-sidebar">
              <div className="score-card">
                <div className="score-label"><span className="live-dot" /> {phase === 'solved' ? 'Puzzle complete' : 'In the zone'}</div>
                <div className="score-stats">
                  <div><Clock3 size={17} /><span><strong data-testid="text-timer">{formatTime(elapsed)}</strong><small>Time</small></span></div>
                  <div><MousePointer2 size={17} /><span><strong data-testid="text-moves">{moves.toString().padStart(2, '0')}</strong><small>Moves</small></span></div>
                </div>
                {phase === 'solved' ? (
                  <div className="solved-stamp"><Trophy size={19} /><span>Nicely done.<small>That was a good one.</small></span></div>
                ) : (
                  <button className="hint-button" onClick={showHint} data-testid="button-hint" type="button">
                    <Lightbulb size={17} />
                    <span><strong>Need a nudge?</strong><small>Highlight a piece that’s out of place</small></span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

              <div className="controls-card">
                <span className="section-kicker">02 / Make your move</span>
                <div className="control-line">
                  <span className="control-icon"><RotateCcw size={16} /></span>
                  <span><strong>Mix it up</strong><small>Start this photo over</small></span>
                  <button className="icon-button" onClick={startPuzzle} data-testid="button-restart-puzzle" type="button" aria-label="Restart puzzle"><RotateCcw size={16} /></button>
                </div>
                <div className="control-line">
                  <span className="control-icon"><ArrowLeft size={16} /></span>
                  <span><strong>Choose another</strong><small>Keep this one for later</small></span>
                  <button className="icon-button" onClick={resetToUpload} data-testid="button-choose-another" type="button" aria-label="Choose another photo"><ChevronRight size={16} /></button>
                </div>
              </div>

              <div className="tip-card">
                <span className="tip-mark">Tip</span>
                <p>Look for strong edges first. A horizon, a sleeve, or a bright corner makes a lovely starting point.</p>
              </div>
            </aside>
          </div>

          {phase === 'solved' && (
            <div className="celebration-card" data-testid="status-puzzle-solved">
              <div className="celebration-icon"><PartyPopper size={24} /></div>
              <div><strong>Picture perfect.</strong><span>You solved it in {moves} moves · {formatTime(elapsed)}</span></div>
              <div className="celebration-actions">
                <button onClick={shareResult} data-testid="button-share-result" type="button"><Copy size={15} /> {copied ? 'Copied' : 'Share result'}</button>
                <button onClick={startPuzzle} data-testid="button-play-again" type="button"><RotateCcw size={15} /> Play again</button>
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="app-footer">
        <span>Made for slow afternoons and favorite photos.</span>
        <span className="footer-dot" />
        <span>Private by design</span>
      </footer>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;