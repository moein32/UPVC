import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Save, Trash2, SplitSquareHorizontal, SplitSquareVertical, PlusCircle, Maximize, ZoomIn, ZoomOut, RefreshCcw, Hand, MousePointer2, Receipt, Check, Edit3, Grid, XCircle, Undo, Redo, LayoutTemplate, Home, Box, Layers, Settings, ChevronDown, ChevronUp, SlidersHorizontal, AlignJustify, AlignCenter, Minus, Plus, Sidebar, Monitor, MoveRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputField, SelectField, PrimaryButton } from '../components/UIComponents';
import { WindowCanvas } from '../components/WindowCanvas';
import { WindowConfig, ProjectDetails, InvoiceItem, ProfileBrand, GlassType, HardwareItem, WindowNode, OpeningDirection, InvoiceDetail } from '../types';
import { pricingStore } from '../services/pricingStore';
import { toPersianDigits, formatPrice, toEnglishDigits } from '../utils/formatting';

// --- DATA: 36 SLIDING TYPOLOGIES DATABASE ---
interface Typology {
    id: string;
    label: string;
    sashes: number;
    openings: OpeningDirection[];
}

const SLIDING_DATA: Record<string, Record<string, Typology[]>> = {
    Monorail: {
        '2-Sash': [
            { id: 'M2-01', label: 'Fixed + Slide R', sashes: 2, openings: ['Fixed', 'SlidingMonorailRight'] },
            { id: 'M2-02', label: 'Slide L + Fixed', sashes: 2, openings: ['SlidingMonorailLeft', 'Fixed'] },
            { id: 'M2-03', label: 'Panel + Slide R', sashes: 2, openings: ['PanelV', 'SlidingMonorailRight'] },
        ],
        '3-Sash': [
            { id: 'M3-01', label: 'F + S + F', sashes: 3, openings: ['Fixed', 'SlidingMonorailRight', 'Fixed'] },
            { id: 'M3-02', label: 'S + F + S', sashes: 3, openings: ['SlidingMonorailRight', 'Fixed', 'SlidingMonorailLeft'] },
            { id: 'M3-03', label: 'P + S + P', sashes: 3, openings: ['PanelV', 'SlidingMonorailRight', 'PanelV'] },
        ],
        '4-Sash': [
            { id: 'M4-01', label: 'F + S + S + F', sashes: 4, openings: ['Fixed', 'SlidingMonorailRight', 'SlidingMonorailLeft', 'Fixed'] },
            { id: 'M4-02', label: 'S + F + F + S', sashes: 4, openings: ['SlidingMonorailRight', 'Fixed', 'Fixed', 'SlidingMonorailLeft'] },
            { id: 'M4-03', label: 'P + S + S + P', sashes: 4, openings: ['PanelV', 'SlidingMonorailRight', 'SlidingMonorailLeft', 'PanelV'] },
        ]
    },
    DoubleRail: {
        '2-Sash': [
            { id: 'D2-01', label: 'S + F', sashes: 2, openings: ['SlidingRight', 'Fixed'] },
            { id: 'D2-02', label: 'F + S', sashes: 2, openings: ['Fixed', 'SlidingLeft'] },
            { id: 'D2-03', label: 'S + S', sashes: 2, openings: ['SlidingRight', 'SlidingLeft'] },
        ],
        '3-Sash': [
            { id: 'D3-01', label: 'S + F + S', sashes: 3, openings: ['SlidingRight', 'Fixed', 'SlidingLeft'] },
            { id: 'D3-02', label: 'F + S + F', sashes: 3, openings: ['Fixed', 'SlidingRight', 'Fixed'] },
            { id: 'D3-03', label: 'S + S + S', sashes: 3, openings: ['SlidingRight', 'SlidingRight', 'SlidingRight'] },
        ],
        '4-Sash': [
            { id: 'D4-01', label: 'S + F + F + S', sashes: 4, openings: ['SlidingRight', 'Fixed', 'Fixed', 'SlidingLeft'] },
            { id: 'D4-02', label: 'F + S + S + F', sashes: 4, openings: ['Fixed', 'SlidingLeft', 'SlidingRight', 'Fixed'] },
            { id: 'D4-03', label: 'S + S + S + S', sashes: 4, openings: ['SlidingRight', 'SlidingRight', 'SlidingLeft', 'SlidingLeft'] },
        ]
    }
};

// --- Constant for engineering deductions (MasterWin) ---
const SLIDING_OVERLAP = 35; // mm
const PROFILE_WIDTH_CONSTANT = 60; // mm

// Fix: Use 'any' for props to resolve TS error on 'key' property during mapping
const TypologyIcon = ({ typology, isActive, onClick }: any) => (
    <div 
        onClick={() => onClick(typology)}
        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl cursor-pointer border-2 transition-all ${isActive ? 'bg-blue-600 border-blue-400 scale-105 shadow-lg' : 'bg-slate-700/50 border-transparent hover:bg-slate-700'}`}
    >
        <div className="w-12 h-8 bg-white/10 rounded flex gap-0.5 p-0.5 relative overflow-hidden">
            {typology.openings.map((op: any, idx: number) => (
                <div key={idx} className="flex-1 bg-white/20 rounded-sm relative flex items-center justify-center">
                    {op.includes('Sliding') && <MoveRight size={8} className={`text-white opacity-60 ${op.includes('Left') ? 'rotate-180' : ''}`} />}
                    {op === 'Fixed' && <div className="w-1 h-1 rounded-full bg-white opacity-20" />}
                </div>
            ))}
        </div>
        <span className="text-[7px] font-black text-white/60 uppercase tracking-tighter">{typology.id}</span>
    </div>
);

const DraggableIcon = ({ type, value, dir, count, label, icon, isActive, onClick, onDragStart, onDragEnd }: any) => {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center gap-1 p-2 rounded-lg cursor-pointer transition-all select-none min-w-[64px]
        ${isActive ? 'bg-orange-500 text-white shadow-lg scale-105' : 'hover:bg-slate-700 text-slate-300'}
      `}
      onClick={(e) => {
        e.preventDefault();
        onClick({ type, value, dir, count });
      }}
      draggable
      onDragStart={(e) => onDragStart(e, type, value, dir, count)}
      onDragEnd={onDragEnd}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[9px] font-medium max-w-[60px] text-center leading-tight">{label}</span>
    </div>
  );
};

const ToolBtn = ({ icon: Icon, label, onClick, isActive, color }: any) => (
  <button 
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all
      ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-700 text-slate-300'}
      ${color ? color : ''}
    `}
  >
    <Icon size={24} />
    <span className="text-[9px] font-medium">{label}</span>
  </button>
);

const FixedIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" opacity="0.2" />
    <line x1="3" y1="12" x2="21" y2="12" opacity="0.2" />
  </svg>
);

const TurnLeftIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M18 6L6 12L18 18" />
  </svg>
);

const TurnRightIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M6 6L18 12L6 18" />
  </svg>
);

const TiltTurnLeftIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M18 6L6 12L18 18" />
    <path d="M6 18L12 6L18 18" strokeDasharray="2 2" opacity="0.6" />
  </svg>
);

const TiltTurnRightIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M6 6L18 12L6 18" />
    <path d="M6 18L12 6L18 18" strokeDasharray="2 2" opacity="0.6" />
  </svg>
);

const SlidingIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.3" />
    <rect x={dir === 'left' ? "4" : "11"} y="4" width="9" height="16" rx="1" fill="currentColor" fillOpacity="0.1" />
    <path d={dir === 'left' ? "M16 12H10M10 12L13 9M10 12L13 15" : "M8 12H14M14 12L11 9M14 12L11 15"} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SlidingMonoIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.2" />
    <rect x={dir === 'left' ? "4" : "11"} y="4" width="9" height="16" rx="1" fill="currentColor" fillOpacity="0.3" />
    <line x1="3" y1="20" x2="21" y2="20" opacity="0.5" />
    <path d={dir === 'left' ? "M14 12H10M10 12L12 10M10 12L12 14" : "M10 12H14M14 12L12 10M14 12L12 14"} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SlidingDoubleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.1" />
    <rect x="4" y="4" width="8" height="16" rx="1" fill="currentColor" fillOpacity="0.1" />
    <rect x="12" y="4" width="8" height="16" rx="1" fill="currentColor" fillOpacity="0.1" />
    <path d="M7 12h10M7 12l2-2M7 12l2 2M17 12l-2-2M17 12l-2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FrenchIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.2" />
    <path d={dir === 'right' ? "M18 6L12 12L18 18 M6 6L12 12L6 18" : "M6 6L12 12L6 18 M18 6L12 12L18 18"} opacity="0.8" />
    <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2 2" opacity="0.4" />
  </svg>
);

const VWIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.3" />
    <path d="M18 6L6 12L18 18" opacity="0.5" />
    <path d="M4 19h16" strokeLinecap="round" opacity="0.6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const AwningIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M6 18L12 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DoorLeftIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M9 3 L19 12 L9 21" strokeDasharray="3 2" />
  </svg>
);

const DoorRightIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M15 3 L5 12 L15 21" strokeDasharray="3 2" />
  </svg>
);

const PanelVIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="8" y1="3" x2="8" y2="21" opacity="0.4" />
    <line x1="12" y1="3" x2="12" y2="21" opacity="0.4" />
    <line x1="16" y1="3" x2="16" y2="21" opacity="0.4" />
  </svg>
);

const PanelHIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="8" x2="21" y2="8" opacity="0.4" />
    <line x1="3" y1="12" x2="21" y2="12" opacity="0.4" />
    <line x1="3" y1="16" x2="21" y2="16" opacity="0.4" />
  </svg>
);

const SplitVerticalIcon = ({ count }: { count: number }) => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="3" opacity="0.2" />
    {count === 2 && <line x1="12" y1="3" x2="12" y2="21" strokeLinecap="round" />}
    {count === 3 && (
      <>
        <line x1="9" y1="3" x2="9" y2="21" strokeLinecap="round" />
        <line x1="15" y1="3" x2="15" y2="21" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const SplitHorizontalIcon = ({ count }: { count: number }) => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="3" opacity="0.2" />
    {count === 2 && <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />}
    {count === 3 && (
      <>
        <line x1="3" y1="9" x2="21" y2="9" strokeLinecap="round" />
        <line x1="3" y1="15" x2="21" y2="15" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const SquareIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const createDefaultLayout = (): WindowNode => ({
  id: 'root',
  type: 'leaf',
  openingType: 'Fixed',
  flex: 1,
  systemType: 'Casement'
});

export const UnitDesigner = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const locationState = (location.state || {}) as { 
    projectDetails?: ProjectDetails, 
    items?: InvoiceItem[],
    editIndex?: number 
  };

  useEffect(() => {
    if (!locationState.projectDetails) navigate('/dashboard', { replace: true });
  }, [locationState, navigate]);

  const [projectDetails] = useState<ProjectDetails>(locationState.projectDetails || {} as ProjectDetails);
  const [projectItems, setProjectItems] = useState<InvoiceItem[]>(locationState.items || []);
  const [editIndex, setEditIndex] = useState<number | undefined>(locationState.editIndex);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [unitCount, setUnitCount] = useState(1); 
  const [systemMode, setSystemMode] = useState<'Casement' | 'Sliding'>('Casement');
  const [slidingRailMode, setSlidingRailMode] = useState<'Monorail' | 'DoubleRail'>('DoubleRail');

  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [glassList, setGlassList] = useState<GlassType[]>([]);
  const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);

  useEffect(() => {
    setBrands(pricingStore.getBrands());
    setGlassList(pricingStore.getGlass());
    setHardwareList(pricingStore.getHardware());
  }, []);

  const [config, setConfig] = useState<WindowConfig>({
    id: Date.now().toString(),
    width: 1200,
    height: 1500,
    profileId: projectDetails.defaultProfileId || '',
    glassId: 'double_4_4',
    hardwareId: 'h1',
    type: 'Custom',
    mullions: 0,
    layout: createDefaultLayout(),
    frameType: 'standard'
  });

  const [history, setHistory] = useState<WindowNode[]>([]);
  const [future, setFuture] = useState<WindowNode[]>([]);

  const pushToHistory = (newLayout: WindowNode) => {
    setHistory(prev => [...prev.slice(-10), config.layout!]);
    setFuture([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [config.layout!, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setConfig(prev => ({ ...prev, layout: previous }));
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, config.layout!]);
    setFuture(prev => prev.slice(1));
    setConfig(prev => ({ ...prev, layout: next }));
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
  const [activeTab, setActiveTab] = useState<'openings' | 'splits' | 'tools'>('openings');
  const [zoomLevel, setZoomLevel] = useState(0.8); 
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  
  const [activeTool, setActiveTool] = useState<{type: 'opening' | 'split', value: string, dir?: string, count?: number} | null>(null);
  const [selectedNodeDims, setSelectedNodeDims] = useState<{w: number, h: number, editableW: boolean, editableH: boolean} | null>(null);
  const [localDims, setLocalDims] = useState<{w: string, h: string, id: string | null}>({ w: '', h: '', id: null });

  const fitToScreen = () => {
    if (!canvasAreaRef.current) return;
    const padding = 120;
    const areaW = canvasAreaRef.current.clientWidth - padding;
    const areaH = canvasAreaRef.current.clientHeight - padding;
    if (areaW <= 0 || areaH <= 0) return;
    const baseW = config.width / 4;
    const baseH = config.height / 4;
    const scaleW = areaW / baseW;
    const scaleH = areaH / baseH;
    const newZoom = Math.min(scaleW, scaleH) * 0.85; 
    setZoomLevel(Math.max(newZoom, 0.15));
  };

  useEffect(() => {
    fitToScreen();
    const timer = setTimeout(fitToScreen, 150); 
    window.addEventListener('resize', fitToScreen);
    return () => {
        window.removeEventListener('resize', fitToScreen);
        clearTimeout(timer);
    };
  }, [config.width, config.height]);

  useEffect(() => {
    if (editIndex !== undefined && editIndex >= 0 && projectItems[editIndex]) {
      const item = projectItems[editIndex];
      setConfig({
        ...item.config,
        layout: item.config.layout || createDefaultLayout(),
        frameType: item.config.frameType || 'standard'
      });
      setUnitCount(item.quantity || 1);
      setSelectedNodeId('root');
    } else {
        if (brands.length > 0 && !config.profileId) {
            setConfig(c => ({
                ...c, 
                profileId: projectDetails.defaultProfileId || brands[0].id, 
                glassId: glassList[0]?.id || 'double_4_4' 
            }));
        }
    }
  }, [editIndex, projectItems, brands, glassList, projectDetails.defaultProfileId]);

  const findParent = (root: WindowNode, id: string): WindowNode | null => {
      if (root.children) {
          if (root.children.some(c => c.id === id)) return root;
          for (const child of root.children) {
              const found = findParent(child, id);
              if (found) return found;
          }
      }
      return null;
  };
  
  const findNode = (root: WindowNode, id: string): WindowNode | null => {
      if (root.id === id) return root;
      if (root.children) {
          for (const child of root.children) {
              const found = findNode(child, id);
              if (found) return found;
          }
      }
      return null;
  };

  const updateNodeInTree = (root: WindowNode, id: string, updater: (n: WindowNode) => WindowNode): WindowNode => {
    if (root.id === id) return updater(root);
    if (root.children) {
      return {
        ...root,
        children: root.children.map(c => updateNodeInTree(c, id, updater))
      };
    }
    return root;
  };

  const handleUpdateNode = (id: string, updates: Partial<WindowNode>) => {
    if (!config.layout) return;
    pushToHistory(config.layout);
    setConfig(prev => ({
        ...prev,
        layout: updateNodeInTree(prev.layout!, id, (node) => ({ ...node, ...updates }))
    }));
  };

  const handleDelete = () => {
     if (!selectedNodeId || !config.layout) return;
     pushToHistory(config.layout);
     setConfig(prev => ({
       ...prev,
       layout: updateNodeInTree(prev.layout!, selectedNodeId, (node) => ({
         id: node.id, type: 'leaf', openingType: 'Fixed', flex: 1, systemType: 'Casement'
       }))
     }));
  };

  const applyTypology = (typology: Typology) => {
      if (!selectedNodeId || !config.layout) return;
      pushToHistory(config.layout);
      
      const newChildren = typology.openings.map((op, i) => ({
          id: Date.now() + `_${i}_${Math.random()}`,
          type: 'leaf' as const,
          openingType: op,
          flex: 1
      }));

      handleUpdateNode(selectedNodeId, {
          type: 'container',
          dir: 'row',
          children: newChildren,
          systemType: 'Sliding',
          slidingRailType: slidingRailMode
      });
  };

  const handleCanvasNodeClick = (id: string) => {
      if (activeTool) {
          const targetNode = findNode(config.layout!, id);
          if (!targetNode) return;
          if (activeTool.type === 'opening') {
               const isFrench = activeTool.value.includes('FrenchWindow');
               handleUpdateNode(id, { 
                   openingType: activeTool.value as any,
                   isFrenchWindow: isFrench 
               });
          } else if (activeTool.type === 'split') {
              if (targetNode.type === 'leaf') {
                  const count = activeTool.count || 2;
                  const existingOpening = (targetNode.openingType as string).includes('Panel') ? 'Fixed' : targetNode.openingType;
                  const newChildren = Array(count).fill(null).map((_, i) => ({
                      id: Date.now() + `_${i}_${Math.random()}`, 
                      type: 'leaf', 
                      openingType: 'Fixed', 
                      flex: 1 
                  })) as WindowNode[];
                  handleUpdateNode(id, { 
                      type: 'container', 
                      dir: activeTool.dir as 'row' | 'col', 
                      children: newChildren, 
                      openingType: (existingOpening && existingOpening !== 'Fixed' && !existingOpening.includes('Panel')) ? existingOpening : undefined,
                      systemType: 'Casement'
                  });
              }
          }
      } else {
          setSelectedNodeId(id);
      }
  };

  const toggleTool = (tool: any) => {
      if (activeTool && activeTool.value === tool.value && activeTool.dir === tool.dir && activeTool.count === tool.count) {
          setActiveTool(null);
      } else {
          setActiveTool(tool);
      }
  };

  const handleDragEnd = () => {
    setTimeout(() => {
    }, 100);
  };

  const calculateNodeDimensions = (node: WindowNode, w: number, h: number, targetId: string): {w: number, h: number} | null => {
      if (node.id === targetId) return { w, h };
      if (node.children) {
          const totalFlex = node.children.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
          for (const child of node.children) {
              const ratio = (child.flex || 1) / totalFlex;
              const childW = node.dir === 'row' ? w * ratio : w;
              const childH = node.dir === 'col' ? h * ratio : h;
              const found = calculateNodeDimensions(child, childW, childH, targetId);
              if (found) return found;
          }
      }
      return null;
  };

  useEffect(() => {
      if(selectedNodeId && config.layout) {
          const dims = calculateNodeDimensions(config.layout, config.width, config.height, selectedNodeId);
          if (dims) {
            const parent = findParent(config.layout, selectedNodeId);
            const editableW = parent ? parent.dir === 'row' : true; 
            const editableH = parent ? parent.dir === 'col' : true;
            setSelectedNodeDims({ ...dims, editableW, editableH });
            if (localDims.id !== selectedNodeId) {
                setLocalDims({ 
                    w: Math.round(dims.w).toString(), 
                    h: Math.round(dims.h).toString(), 
                    id: selectedNodeId 
                });
            }
          } else {
            setSelectedNodeDims(null);
            setLocalDims({ w: '', h: '', id: null });
          }
      } else {
          setSelectedNodeDims(null);
          setLocalDims({ w: '', h: '', id: null });
      }
  }, [selectedNodeId, config.layout, config.width, config.height]);

  const handleGlobalResize = (newValStr: string, dim: 'w' | 'h') => {
      const val = toEnglishDigits(newValStr);
      if (val === '') {
          setConfig(prev => ({ ...prev, [dim === 'w' ? 'width' : 'height']: 0 }));
          return;
      }
      const num = Number(val);
      if (!isNaN(num)) {
          setConfig(prev => ({ ...prev, [dim === 'w' ? 'width' : 'height']: num }));
      }
  }

  const handleDirectDimensionEdit = (dim: 'w' | 'h', val: number) => {
    const current = dim === 'w' ? config.width : config.height;
    const newVal = window.prompt(dim === 'w' ? 'عرض را وارد کنید (میلی‌متر):' : 'ارتفاع را وارد کنید (میلی‌متر):', current.toString());
    if (newVal !== null) {
        handleGlobalResize(newVal, dim);
    }
  };

  const handleChildResize = (nodeId: string, childIndex: number, currentSize: number, totalSize: number) => {
      const newValStr = window.prompt('اندازه جدید را وارد کنید (میلی‌متر):', Math.round(currentSize).toString());
      if (newValStr === null) return;
      const newVal = Number(toEnglishDigits(newValStr));
      if (isNaN(newVal) || newVal <= 50 || newVal >= totalSize - 50) return;
      const node = findNode(config.layout!, nodeId);
      if (!node || !node.children) return;
      const totalFlex = node.children.reduce((s, c) => s + (c.flex || 1), 0);
      const targetFlex = (newVal / totalSize) * totalFlex;
      const currentFlex = node.children[childIndex].flex || 1;
      const flexDiff = targetFlex - currentFlex;
      let neighborIndex = childIndex + 1 < node.children.length ? childIndex + 1 : childIndex - 1;
      const newChildren = node.children.map((child, idx) => {
          if (idx === childIndex) return { ...child, flex: targetFlex };
          if (idx === neighborIndex) return { ...child, flex: Math.max(0.1, (child.flex || 1) - flexDiff) };
          return child;
      });
      handleUpdateNode(nodeId, { children: newChildren });
  };

  const handleLocalInputChange = (val: string, dim: 'w' | 'h') => {
      setLocalDims(prev => ({ ...prev, [dim]: toEnglishDigits(val) }));
  };

  const commitManualResize = (dim: 'w' | 'h') => {
      if (!selectedNodeId || !config.layout) return;
      const rawVal = dim === 'w' ? localDims.w : localDims.h;
      const newVal = Number(rawVal);
      if (isNaN(newVal) || newVal <= 0) return;
      const parent = findParent(config.layout, selectedNodeId);
      if (!parent || !parent.children) return; 
      if ((parent.dir === 'row' && dim === 'h') || (parent.dir === 'col' && dim === 'w')) return;
      const parentDims = calculateNodeDimensions(config.layout, config.width, config.height, parent.id);
      if(!parentDims) return;
      const totalSize = parent.dir === 'row' ? parentDims.w : parentDims.h;
      const totalFlex = parent.children.reduce((a, b) => a + (b.flex || 1), 0);
      const targetFlex = (newVal / totalSize) * totalFlex;
      const nodeIndex = parent.children.findIndex(c => c.id === selectedNodeId);
      const currentFlex = parent.children[nodeIndex].flex || 1;
      const flexDiff = targetFlex - currentFlex;
      let neighborIndex = nodeIndex + 1 < parent.children.length ? nodeIndex + 1 : nodeIndex - 1;
      const newChildren = parent.children.map((child, idx) => {
          if (idx === nodeIndex) return { ...child, flex: targetFlex };
          if (idx === neighborIndex) return { ...child, flex: Math.max(0.1, (child.flex || 1) - flexDiff) };
          return child;
      });
      handleUpdateNode(parent.id, { children: newChildren });
  };
  
  const handleDragStart = (e: React.DragEvent, type: 'opening' | 'split', value: string, dir?: string, count?: number) => {
      e.dataTransfer.setData('actionType', type);
      e.dataTransfer.setData('value', value);
      if (dir) e.dataTransfer.setData('dir', dir);
      if (count) e.dataTransfer.setData('count', count.toString());
      e.dataTransfer.effectAllowed = 'copy';
      setActiveTool({ type, value, dir, count });
  };

  const calculateWindowStats = (node: WindowNode, w: number, h: number) => {
    let stats = {
        sashWindowMeters: 0,
        sashDoorMeters: 0,
        mullionMeters: 0,
        floatingMullionMeters: 0,
        monorailFrameMeters: 0,
        glassArea: 0,
        panelArea: 0,
        beadMeters: 0,
        hardware: { Turn: 0, TiltTurn: 0, Sliding: 0, Door: 0 }
    };

    const processHardware = (type: OpeningDirection | undefined) => {
        if (!type) return;
        if (type.startsWith('Turn')) stats.hardware.Turn += 1;
        else if (type.startsWith('TiltTurn')) stats.hardware.TiltTurn += 1;
        else if (type.startsWith('Sliding')) stats.hardware.Sliding += 1;
        else if (type.startsWith('Door')) stats.hardware.Door += 1;
    };

    // SLIDING SYSTEM LOGIC (Precision Deductions with Overlap)
    if (node.systemType === 'Sliding' && node.children) {
        const numSashes = node.children.length;
        // Overlap Logic: 2 sashes meet once, 3 sashes meet twice (MasterWin standard)
        const overlapsCount = numSashes === 2 ? 1 : numSashes - 1;
        // Formula: LeafWidth = (TotalWidth + (Overlaps * OverlapWidth)) / NumSashes
        const leafW = (w + (overlapsCount * SLIDING_OVERLAP)) / numSashes;
        const leafH = h;
        
        if (node.slidingRailType === 'Monorail') {
            stats.monorailFrameMeters += (w + h) * 2;
        }

        node.children.forEach(child => {
            const isLeafOpening = child.openingType?.includes('Sliding');
            if (isLeafOpening) {
                stats.sashWindowMeters += (leafW + leafH) * 2;
                processHardware(child.openingType);
            }
            if (child.openingType?.includes('Panel')) {
                stats.panelArea += leafW * leafH;
            } else {
                // Deducting profile widths for actual glass size
                const gW = leafW - (PROFILE_WIDTH_CONSTANT * 2);
                const gH = leafH - (PROFILE_WIDTH_CONSTANT * 2);
                stats.glassArea += Math.max(0, gW * gH);
            }
            stats.beadMeters += (leafW + leafH) * 2;
        });
        return stats;
    }

    // CASEMENT / STANDARD TREE LOGIC
    if (node.type === 'container') {
        if (node.openingType && node.openingType !== 'Fixed') {
             processHardware(node.openingType);
             const perimeter = (w + h) * 2;
             if (node.openingType.includes('Door')) stats.sashDoorMeters += perimeter;
             else stats.sashWindowMeters += perimeter;
        }

        if (node.children) {
            const totalFlex = node.children.reduce((sum, c) => sum + (c.flex || 1), 0) || 1;
            
            // French Window / Floating Mullion Logic
            if (node.isFrenchWindow) {
                stats.floatingMullionMeters += h;
            } else {
                if (node.dir === 'row') stats.mullionMeters += (node.children.length - 1) * h;
                else stats.mullionMeters += (node.children.length - 1) * w;
            }

            node.children.forEach(child => {
                const ratio = (child.flex || 1) / totalFlex;
                const childW = node.dir === 'row' ? w * ratio : w;
                const childH = node.dir === 'col' ? h * ratio : h;
                const childStats = calculateWindowStats(child, childW, childH);
                stats.sashWindowMeters += childStats.sashWindowMeters;
                stats.sashDoorMeters += childStats.sashDoorMeters;
                stats.mullionMeters += childStats.mullionMeters;
                stats.floatingMullionMeters += childStats.floatingMullionMeters;
                stats.monorailFrameMeters += childStats.monorailFrameMeters;
                stats.glassArea += childStats.glassArea;
                stats.panelArea += childStats.panelArea;
                stats.beadMeters += childStats.beadMeters;
                stats.hardware.Turn += childStats.hardware.Turn;
                stats.hardware.TiltTurn += childStats.hardware.TiltTurn;
                stats.hardware.Sliding += childStats.hardware.Sliding;
                stats.hardware.Door += childStats.hardware.Door;
            });
        }
    } else {
        if (node.openingType && node.openingType !== 'Fixed' && !node.openingType.includes('Panel')) {
            processHardware(node.openingType);
            const perimeter = (w + h) * 2;
            if (node.openingType.includes('Door')) stats.sashDoorMeters += perimeter;
            else stats.sashWindowMeters += perimeter;
        }
        if (node.openingType && node.openingType.includes('Panel')) stats.panelArea += w * h;
        else stats.glassArea += w * h;
        stats.beadMeters += (w + h) * 2;
    }
    return stats;
  };

  const calculatePrice = () => {
    if (!config.layout) return {
         profileMeters: 0, profilePrice: 0, glassArea: 0, glassPrice: 0, sashCount: 0, hardwarePrice: 0, totalPrice: 0, unitPrice: 0, details: []
    };
    const stats = calculateWindowStats(config.layout, config.width, config.height);
    
    const frameM = stats.monorailFrameMeters > 0 ? 0 : ((config.width + config.height) * 2) / 1000;
    const monorailFrameM = stats.monorailFrameMeters / 1000;
    const mullionM = stats.mullionMeters / 1000;
    const floatingMullionM = stats.floatingMullionMeters / 1000;
    const sashWindowM = stats.sashWindowMeters / 1000;
    const sashDoorM = stats.sashDoorMeters / 1000;
    const beadM = stats.beadMeters / 1000;
    const glassA = stats.glassArea / 1000000; 
    const panelA = stats.panelArea / 1000000;
    
    const galoM = frameM + monorailFrameM + mullionM + floatingMullionM + sashWindowM + sashDoorM;
    
    const brand = brands.find(b => b.id === config.profileId);
    const glassType = glassList.find(g => g.id === config.glassId);
    const hwItems = pricingStore.getHardware();
    const panelType = hwItems.find(h => h.id === 'panel_upvc');
    const panelPricePerM2 = panelType?.pricePerSet || 1500000;
    
    const frameCompId = config.frameType === 'renovation' ? 'renovation' : 'frame';
    const framePrice = brand?.components.find(c => c.id === frameCompId)?.price || 0;
    const monorailPrice = brand?.components.find(c => c.id === 'monorail_frame')?.price || 0;
    const frameName = config.frameType === 'renovation' ? 'پروفیل فریم بازسازی' : 'پروفیل فریم';
    
    const mullionPrice = brand?.components.find(c => c.id === 'mullion')?.price || 0;
    const floatingMullionPrice = brand?.components.find(c => c.id === 'floating_mullion')?.price || 0;
    const sashWindowPrice = brand?.components.find(c => c.id === 'sash_window')?.price || 0;
    const sashDoorPrice = brand?.components.find(c => c.id === 'sash_door')?.price || 0;
    const beadPrice = brand?.components.find(c => c.id === 'bead')?.price || 60000;
    const galoPrice = brand?.components.find(c => c.id === 'galvanized')?.price || 150000;
    const glassPricePerM2 = glassType?.pricePerSqm || 0;
    
    const details: InvoiceDetail[] = [];
    let rowId = 1;
    
    if (frameM > 0) details.push({ rowId: rowId++, name: frameName, unit: 'متر طول', quantity: Number(frameM.toFixed(2)), unitPrice: framePrice, totalPrice: Math.round(frameM * framePrice) });
    if (monorailFrameM > 0) details.push({ rowId: rowId++, name: 'پروفیل فریم کشویی تک‌ریل (Monorail)', unit: 'متر طول', quantity: Number(monorailFrameM.toFixed(2)), unitPrice: monorailPrice, totalPrice: Math.round(monorailFrameM * monorailPrice) });
    if (sashWindowM > 0) details.push({ rowId: rowId++, name: 'پروفیل سش (Sash) بازشو', unit: 'متر طول', quantity: Number(sashWindowM.toFixed(2)), unitPrice: sashWindowPrice, totalPrice: Math.round(sashWindowM * sashWindowPrice) });
    if (sashDoorM > 0) details.push({ rowId: rowId++, name: 'پروفیل سش (Sash) درب', unit: 'متر طول', quantity: Number(sashDoorM.toFixed(2)), unitPrice: sashDoorPrice, totalPrice: Math.round(sashDoorM * sashDoorPrice) });
    if (mullionM > 0) details.push({ rowId: rowId++, name: 'پروفیل مولیون (وادار)', unit: 'متر طول', quantity: Number(mullionM.toFixed(2)), unitPrice: mullionPrice, totalPrice: Math.round(mullionM * mullionPrice) });
    if (floatingMullionM > 0) details.push({ rowId: rowId++, name: 'مولیون متحرک (French Window)', unit: 'متر طول', quantity: Number(floatingMullionM.toFixed(2)), unitPrice: floatingMullionPrice, totalPrice: Math.round(floatingMullionM * floatingMullionPrice) });
    
    if (glassA > 0) details.push({ rowId: rowId++, name: glassType?.name || 'شیشه دوجداره', unit: 'متر مربع', quantity: Number(glassA.toFixed(2)), unitPrice: glassPricePerM2, totalPrice: Math.round(glassA * glassPricePerM2) });
    if (panelA > 0) details.push({ rowId: rowId++, name: 'پنل UPVC', unit: 'متر مربع', quantity: Number(panelA.toFixed(2)), unitPrice: panelPricePerM2, totalPrice: Math.round(panelA * panelPricePerM2) });
    
    if (beadM > 0) details.push({ rowId: rowId++, name: 'زهوار (Beading) پروفیل', unit: 'متر طول', quantity: Number(beadM.toFixed(2)), unitPrice: beadPrice, totalPrice: Math.round(beadM * beadPrice) });
    if (galoM > 0) details.push({ rowId: rowId++, name: 'گالوانیزه تقویتی (Reinforcement)', unit: 'متر طول', quantity: Number(galoM.toFixed(2)), unitPrice: galoPrice, totalPrice: Math.round(galoM * galoPrice) });

    const hwBrands = pricingStore.getHardwareBrands();
    let hardwareTotalSum = 0;
    const hardwareMap = [
      { type: 'Turn', label: 'یراق تک‌حالته', count: stats.hardware.Turn },
      { type: 'TiltTurn', label: 'یراق دو‌حالته', count: stats.hardware.TiltTurn },
      { type: 'Sliding', label: 'یراق کشویی', count: stats.hardware.Sliding },
      { type: 'Door', label: 'یراق درب بالکنی', count: stats.hardware.Door },
    ];
    
    hardwareMap.forEach(hwEntry => {
      if (hwEntry.count > 0) {
        const match = hwItems.find(item => item.type === hwEntry.type);
        const brandMatch = hwBrands.find(b => b.id === match?.brandId);
        const brandName = brandMatch?.name || '';
        const price = match?.pricePerSet || 0;
        const total = hwEntry.count * price;
        hardwareTotalSum += total;
        details.push({ rowId: rowId++, name: `${hwEntry.label} برند ${brandName}`, unit: 'دست', quantity: hwEntry.count, unitPrice: price, totalPrice: Math.round(total) });
      }
    });

    const unitPrice = details.reduce((acc, d) => acc + d.totalPrice, 0);
    
    return {
        profileMeters: Number(galoM.toFixed(2)),
        profilePrice: Math.round(unitPrice - (glassA * glassPricePerM2 + panelA * panelPricePerM2 + hardwareTotalSum)),
        glassArea: Number(glassA.toFixed(2)),
        glassPrice: Math.round(glassA * glassPricePerM2 + panelA * panelPricePerM2),
        sashCount: stats.hardware.Turn + stats.hardware.TiltTurn + stats.hardware.Sliding + stats.hardware.Door,
        hardwarePrice: Math.round(hardwareTotalSum),
        totalPrice: unitPrice,
        unitPrice: unitPrice,
        details: details
    };
  };

  const handleAddToList = () => {
      const calculations = calculatePrice();
      const newItem: InvoiceItem = {
          id: Date.now().toString(),
          config: { ...config },
          quantity: unitCount, 
          calculations
      };
      const updatedItems = [...projectItems];
      if (editIndex !== undefined) {
          updatedItems[editIndex] = newItem;
      } else {
          updatedItems.push(newItem);
      }

      const totalMaterialPrice = updatedItems.reduce((acc, i) => acc + (i.calculations.totalPrice * i.quantity), 0);
      const installationCost = Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
      const finalProjectPrice = totalMaterialPrice + installationCost;

      const projectToSave = {
        ...projectDetails,
        items: updatedItems,
        totalPrice: finalProjectPrice 
      };
      
      pricingStore.saveProject(projectToSave);
      setProjectItems(updatedItems);
      setLastSavedId(newItem.id);

      if (editIndex !== undefined) {
          navigate('/breakdown', { state: { projectDetails, items: updatedItems } });
      } else {
          setConfig(prev => ({
              ...prev,
              id: Date.now().toString(),
              width: 1200,
              height: 1500,
              layout: createDefaultLayout()
          }));
          setUnitCount(1);
          setHistory([]);
          setFuture([]);
          setSelectedNodeId('root');
          setTimeout(() => setLastSavedId(null), 2000);
      }
  };

  const isRootSelected = selectedNodeId === 'root' || selectedNodeId === null;

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center z-30 shadow-sm border-b border-slate-200 shrink-0">
        <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-lg text-slate-600 active:bg-slate-200 transition-colors">
                <ArrowRight size={20} className={i18n.language === 'en' ? 'rotate-180' : ''} />
            </button>
            <button onClick={() => navigate('/dashboard')} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-blue-600">
                <Home size={20} />
            </button>
        </div>
        <div className="text-center">
             <h1 className="font-bold text-slate-800 text-lg">{t('unit_design')}</h1>
             <p className="text-[10px] text-slate-500">{projectDetails.customerName}</p>
        </div>
        <div className="flex gap-2">
             <button onClick={handleUndo} disabled={history.length === 0} className="p-2 bg-slate-100 rounded text-slate-600 disabled:opacity-30">
                <Undo size={18} />
             </button>
             <button onClick={handleRedo} disabled={future.length === 0} className="p-2 bg-slate-100 rounded text-slate-600 disabled:opacity-30">
                <Redo size={18} />
             </button>
        </div>
      </div>

      <div className="bg-slate-800 text-white z-20 shadow-md flex flex-col shrink-0">
        <div className="flex border-b border-slate-700">
          <div className="flex-1 flex p-1 bg-slate-900/50 rounded-lg m-2">
              <button 
                onClick={() => setSystemMode('Casement')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-black transition-all ${systemMode === 'Casement' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}
              >
                  <Sidebar size={14} /> لولایی (Casement)
              </button>
              <button 
                onClick={() => setSystemMode('Sliding')} 
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-black transition-all ${systemMode === 'Sliding' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}
              >
                  <Monitor size={14} /> کشویی (Sliding)
              </button>
          </div>
        </div>
        
        <div className="flex border-b border-slate-700 bg-slate-800/50">
          <button onClick={() => setActiveTab('openings')} className={`flex-1 py-3 text-[11px] font-bold transition-colors ${activeTab === 'openings' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}>{t('opening')}</button>
          <button onClick={() => setActiveTab('splits')} className={`flex-1 py-3 text-[11px] font-bold transition-colors ${activeTab === 'splits' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}>{t('splits')}</button>
          <button onClick={() => setActiveTab('tools')} className={`flex-1 py-3 text-[11px] font-bold transition-colors ${activeTab === 'tools' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}>{t('tools')}</button>
        </div>

        <div className="p-3 h-32 overflow-x-auto no-scrollbar bg-slate-800 relative">
           {activeTab === 'openings' && systemMode === 'Casement' && (
              <div className="flex items-center gap-4 h-full">
                  <div className="flex items-center gap-2 pr-2 border-r border-slate-600/50 h-full">
                      <DraggableIcon type="opening" value="Fixed" label={t('fixed')} icon={<FixedIcon />} isActive={activeTool?.value === 'Fixed'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TurnLeft" label={t('turn_left')} icon={<TurnLeftIcon />} isActive={activeTool?.value === 'TurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TurnRight" label={t('turn_right')} icon={<TurnRightIcon />} isActive={activeTool?.value === 'TurnRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TiltTurnLeft" label={t('tilt_turn_left')} icon={<TiltTurnLeftIcon />} isActive={activeTool?.value === 'TiltTurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TiltTurnRight" label={t('tilt_turn_right')} icon={<TiltTurnRightIcon />} isActive={activeTool?.value === 'TiltTurnRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="Awning" label="کلنگی (بالا)" icon={<AwningIcon />} isActive={activeTool?.value === 'Awning'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  </div>
                  <div className="flex items-center gap-2 px-2 border-r border-slate-600/50 h-full">
                      <DraggableIcon type="opening" value="FrenchWindowLeft" label="فرانسوی چپ" icon={<FrenchIcon dir="left"/>} isActive={activeTool?.value === 'FrenchWindowLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="FrenchWindowRight" label="فرانسوی راست" icon={<FrenchIcon dir="right"/>} isActive={activeTool?.value === 'FrenchWindowRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  </div>
                  <div className="flex items-center gap-2 pl-2 h-full">
                       <DraggableIcon type="opening" value="DoorLeft" label={t('door') + ' راست'} icon={<DoorRightIcon />} isActive={activeTool?.value === 'DoorLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                       <DraggableIcon type="opening" value="DoorRight" label={t('door') + ' چپ'} icon={<DoorLeftIcon />} isActive={activeTool?.value === 'DoorRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  </div>
                  <div className="flex items-center gap-2 pl-2 h-full border-l border-slate-600/50">
                       <DraggableIcon type="opening" value="PanelV" label="پنل عمودی" icon={<PanelVIcon />} isActive={activeTool?.value === 'PanelV'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                       <DraggableIcon type="opening" value="PanelH" label="پنل افقی" icon={<PanelHIcon />} isActive={activeTool?.value === 'PanelH'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  </div>
              </div>
           )}

           {activeTab === 'openings' && systemMode === 'Sliding' && (
               <div className="flex flex-col h-full gap-2">
                   <div className="flex gap-2 p-1 bg-slate-900/40 rounded-lg w-fit">
                       <button onClick={() => setSlidingRailMode('Monorail')} className={`px-4 py-1 rounded text-[9px] font-black transition-all ${slidingRailMode === 'Monorail' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>MONORAIL (۹ تیپ)</button>
                       <button onClick={() => setSlidingRailMode('DoubleRail')} className={`px-4 py-1 rounded text-[9px] font-black transition-all ${slidingRailMode === 'DoubleRail' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>DOUBLE RAIL (۲۷ تیپ)</button>
                   </div>
                   <div className="flex gap-4 items-center overflow-x-auto no-scrollbar pb-1">
                        {Object.entries(SLIDING_DATA[slidingRailMode]).map(([category, typologies]) => (
                            <div key={category} className="flex flex-col gap-1 pr-3 first:pr-0 border-r border-slate-700 last:border-0">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{category}</span>
                                <div className="flex gap-2">
                                    {typologies.map(t => (
                                        <TypologyIcon key={t.id} typology={t} isActive={false} onClick={applyTypology} />
                                    ))}
                                </div>
                            </div>
                        ))}
                   </div>
               </div>
           )}

           {activeTab === 'splits' && (
              <div className="flex items-center gap-4 h-full">
                  <DraggableIcon type="split" dir="row" count={2} label={t('split_v_2')} icon={<SplitVerticalIcon count={2} />} isActive={activeTool?.dir === 'row' && activeTool.count === 2} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  <DraggableIcon type="split" dir="col" count={2} label={t('split_h_2')} icon={<SplitHorizontalIcon count={2} />} isActive={activeTool?.dir === 'col' && activeTool.count === 2} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                  <DraggableIcon type="split" dir="row" count={3} label={t('split_v_3')} icon={<SplitVerticalIcon count={3} />} isActive={activeTool?.dir === 'row' && activeTool.count === 3} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  <DraggableIcon type="split" dir="col" count={3} label={t('split_h_3')} icon={<SplitHorizontalIcon count={3} />} isActive={activeTool?.dir === 'col' && activeTool.count === 3} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                  <DraggableIcon type="split" dir="row" count={1} value="clear" label={t('clear_split')} icon={<SquareIcon />} isActive={activeTool?.value === 'clear'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
              </div>
           )}
            {activeTab === 'tools' && (
              <div className="flex items-center gap-4 h-full">
                   <ToolBtn icon={Trash2} label={t('delete_item')} color="text-red-400" onClick={handleDelete} />
                   <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                   <ToolBtn icon={MousePointer2} label={t('select')} onClick={() => setActiveTool(null)} isActive={activeTool === null} />
              </div>
           )}
        </div>
      </div>

      <div ref={canvasAreaRef} className="flex-1 relative bg-slate-100 overflow-hidden flex flex-col min-h-[300px]">
        {activeTool && (
           <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
                <div className="bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce pointer-events-auto">
                    <span>{t('active_tool_hint')}</span>
                    <button onClick={() => setActiveTool(null)} className="ml-2 bg-white/20 rounded-full p-0.5"><XCircle size={16}/></button>
                </div>
           </div>
        )}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white rounded-lg shadow-md p-1">
           <button onClick={() => setZoomLevel(z => Math.min(z + 0.1, 4))} className="p-2 text-slate-600 hover:bg-slate-100 rounded"><ZoomIn size={20}/></button>
           <button onClick={fitToScreen} className="p-2 text-slate-600 hover:bg-slate-100 rounded" title="Fit to Screen"><RefreshCcw size={16}/></button>
           <button onClick={() => setZoomLevel(z => Math.max(z - 0.1, 0.1))} className="p-2 text-slate-600 hover:bg-slate-100 rounded"><ZoomOut size={20}/></button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center p-1 cursor-default">
             <div className="transition-transform duration-300 ease-out origin-center" style={{ transform: `scale(${zoomLevel})` }}>
                <div className="relative select-none" style={{ width: config.width / 4, height: config.height / 4 }}>
                  {config.layout && (
                    <WindowCanvas node={config.layout} selectedId={selectedNodeId} onSelect={handleCanvasNodeClick} onUpdateNode={handleUpdateNode} onDimensionEdit={handleDirectDimensionEdit} onChildResize={handleChildResize} width={config.width} height={config.height} isRoot={true} frameType={config.frameType} />
                  )}
                </div>
             </div>
        </div>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
          <div className="max-w-xl mx-auto flex flex-col items-center gap-3">
              <div className={`w-full bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-500 pointer-events-auto ${isPanelOpen ? 'max-h-[500px] p-6' : 'max-h-0 p-0 border-none opacity-0'}`}>
                  <div className="space-y-6">
                      <div className={`p-4 rounded-3xl border transition-colors ${!isRootSelected ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${!isRootSelected ? 'text-orange-600' : 'text-slate-500'}`}>{isRootSelected ? t('global_dims') : t('section_dims')}</span>
                            {!isRootSelected && <button onClick={() => setSelectedNodeId('root')} className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">بازگشت به ابعاد کل</button>}
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    inputMode="numeric" 
                                    disabled={!isRootSelected && !selectedNodeDims?.editableW}
                                    value={isRootSelected ? (config.width === 0 ? '' : config.width) : localDims.w} 
                                    onChange={(e) => isRootSelected ? handleGlobalResize(e.target.value, 'w') : handleLocalInputChange(e.target.value, 'w')} 
                                    onBlur={() => !isRootSelected && commitManualResize('w')}
                                    className={`w-full pl-8 pr-2 py-3 rounded-xl border text-center font-black text-sm transition-all ${(!isRootSelected && !selectedNodeDims?.editableW) ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-slate-200 focus:border-blue-500'}`} 
                                    style={{ direction: 'ltr' }} 
                                />
                                <span className="absolute left-3 top-3.5 text-[10px] text-slate-400">mm</span>
                            </div>
                            <span className="text-slate-300 font-bold">×</span>
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    inputMode="numeric" 
                                    disabled={!isRootSelected && !selectedNodeDims?.editableH}
                                    value={isRootSelected ? (config.height === 0 ? '' : config.height) : localDims.h} 
                                    onChange={(e) => isRootSelected ? handleGlobalResize(e.target.value, 'h') : handleLocalInputChange(e.target.value, 'h')} 
                                    onBlur={() => !isRootSelected && commitManualResize('h')}
                                    className={`w-full pl-8 pr-2 py-3 rounded-xl border text-center font-black text-sm transition-all ${(!isRootSelected && !selectedNodeDims?.editableH) ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-slate-200 focus:border-blue-500'}`} 
                                    style={{ direction: 'ltr' }} 
                                />
                                <span className="absolute left-3 top-3.5 text-[10px] text-slate-400">mm</span>
                            </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                          <div className="bg-blue-50/50 p-2 pl-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><Box size={20} /></div>
                              <div className="flex-1">
                                  <label className="text-[9px] font-black text-blue-400 uppercase block mb-0.5">نوع شیشه و جداره</label>
                                  <select 
                                      value={config.glassId}
                                      onChange={(e) => setConfig(prev => ({ ...prev, glassId: e.target.value }))}
                                      className="w-full bg-transparent border-none outline-none text-xs font-black text-slate-700 p-0"
                                  >
                                      {glassList.map(glass => (
                                          <option key={glass.id} value={glass.id}>{glass.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                          
                          <div className="bg-indigo-50/50 p-2 pl-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
                              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><Layers size={20} /></div>
                              <div className="flex-1">
                                  <label className="text-[9px] font-black text-indigo-400 uppercase block mb-0.5">نوع پروفیل فریم</label>
                                  <select 
                                      value={config.frameType || 'standard'}
                                      onChange={(e) => setConfig(prev => ({ ...prev, frameType: e.target.value as any }))}
                                      className="w-full bg-transparent border-none outline-none text-xs font-black text-slate-700 p-0"
                                  >
                                      <option value="standard">فریم ساده (استاندارد)</option>
                                      <option value="renovation">فریم بازسازی (بال‌دار)</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="w-full flex items-center gap-2 pointer-events-auto">
                  <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className={`h-14 w-14 flex items-center justify-center rounded-full transition-all shadow-xl border border-white/20 ${isPanelOpen ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  >
                     {isPanelOpen ? <ChevronDown size={24}/> : <SlidersHorizontal size={22}/>}
                  </button>
                  
                  <div className="flex-1 flex gap-2 h-14 bg-white/95 backdrop-blur-xl border border-white/40 p-1.5 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.15)]">
                      <div className="flex items-center bg-slate-100 rounded-full px-2 py-1 border border-slate-200">
                          <button 
                            onClick={() => setUnitCount(prev => Math.max(1, prev - 1))}
                            className="p-1.5 bg-white text-slate-700 rounded-full shadow-sm hover:bg-slate-50 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <div className="w-10 text-center flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 leading-none">تعداد</span>
                            <span className="text-xs font-black text-slate-800">{toPersianDigits(unitCount)}</span>
                          </div>
                          <button 
                            onClick={() => setUnitCount(prev => prev + 1)}
                            className="p-1.5 bg-white text-slate-700 rounded-full shadow-sm hover:bg-slate-50 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                      </div>

                      <button 
                        onClick={handleAddToList}
                        className={`flex-1 rounded-full text-[10px] font-black flex items-center justify-center gap-2 transition-all ${lastSavedId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}
                      >
                         {lastSavedId ? <Check size={16}/> : <PlusCircle size={16}/>}
                         {editIndex !== undefined ? 'تایید' : 'افزودن'}
                      </button>
                      
                      {(projectItems.length > 0 || lastSavedId) && (
                          <button 
                            onClick={() => navigate('/breakdown', { state: { projectDetails, items: projectItems } })}
                            className="flex-[1.5] bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                          >
                             <Receipt size={16}/> فاکتور
                          </button>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
