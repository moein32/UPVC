
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ArrowRight, Save, Trash2, SplitSquareHorizontal, SplitSquareVertical, PlusCircle, Maximize, ZoomIn, ZoomOut, RefreshCcw, Hand, MousePointer2, Receipt, Check, Edit3, Grid, XCircle, Undo, Redo, LayoutTemplate, Home, Box, Layers, Settings, ChevronDown, ChevronUp, SlidersHorizontal, AlignJustify, AlignCenter, Minus, Plus, Sidebar, Monitor, MoveRight, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { InputField, SelectField, PrimaryButton } from '../components/UIComponents';
import { WindowCanvas } from '../components/WindowCanvas';
import { WindowConfig, ProjectDetails, InvoiceItem, ProfileBrand, GlassType, HardwareItem, WindowNode, OpeningDirection, InvoiceDetail } from '../types';
import { pricingStore } from '../services/pricingStore';
import { toPersianDigits, formatPrice, toEnglishDigits } from '../utils/formatting';

// --- CONSTANTS ---
// Reduced padding to maximize the unit's zoom on screen per user request.
const CANVAS_PADDING = 30; 

// --- HOOKS ---
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useLayoutEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);
  return matches;
};

// --- DATA: SLIDING TYPOLOGIES DATABASE ---
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

// --- ICONS & UI ELEMENTS ---
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

const DraggableIcon = ({ type, value, dir, count, label, icon, isActive, onClick, onDragStart, onDragEnd, isCollapsed, isDark }: any) => {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all select-none
        ${isActive ? 'bg-blue-600 text-white shadow-lg scale-105' : (isDark ? 'hover:bg-slate-700 bg-slate-800/20 text-slate-300 border border-slate-700/50' : 'hover:bg-slate-100 bg-white text-slate-700 border border-slate-200')}
        ${isCollapsed ? 'min-w-[70px] h-[70px]' : 'min-w-[64px]'}
      `}
      onClick={(e) => { e.preventDefault(); onClick({ type, value, dir, count }); }}
      draggable
      onDragStart={(e) => onDragStart(e, type, value, dir, count)}
      onDragEnd={onDragEnd}
      title={label}
    >
      <div className={`${isCollapsed ? 'w-6 h-6' : 'w-8 h-8'} flex items-center justify-center`}>
        {icon}
      </div>
      <span className={`${isCollapsed ? 'text-[8.5px]' : 'text-[9.5px]'} font-bold max-w-[66px] text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full px-0.5`}>{label}</span>
    </div>
  );
};

const ToolBtn = ({ icon: Icon, label, onClick, isActive, color, isCollapsed, isDark }: any) => (
  <button 
    onClick={onClick}
    title={label}
    className={`
      flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all
      ${isActive ? 'bg-blue-600 text-white shadow-lg' : (isDark ? 'hover:bg-slate-700 bg-slate-800/20 text-slate-300 border border-slate-700/50' : 'hover:bg-slate-100 bg-white text-slate-700 border border-slate-200')}
      ${color ? color : ''}
      ${isCollapsed ? 'min-w-[70px] h-[70px]' : 'w-full min-h-[64px]'}
    `}
  >
    <Icon size={isCollapsed ? 20 : 24} />
    <span className={`${isCollapsed ? 'text-[8.5px]' : 'text-[9.5px]'} font-bold max-w-[66px] text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full px-0.5`}>{label}</span>
  </button>
);

const FixedIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" opacity="0.3" /><line x1="3" y1="12" x2="21" y2="12" opacity="0.3" /></svg>);
const TurnLeftIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M6 6L18 12L6 18" /></svg>);
const TurnRightIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M18 6L6 12L18 18" /></svg>);
const TiltTurnLeftIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M6 6L18 12L6 18" /><path d="M6 18L12 6L18 18" strokeDasharray="3 2" opacity="0.5" /></svg>);
const TiltTurnRightIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M18 6L6 12L18 18" /><path d="M6 18L12 6L18 18" strokeDasharray="3 2" opacity="0.5" /></svg>);
const AwningIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M6 18L12 6L18 18" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const HopperIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M6 6L12 18L18 6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const DoorLeftIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M15 3 L5 12 L15 21" strokeDasharray="3 2" /></svg>);
const DoorRightIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 3 L19 12 L9 21" strokeDasharray="3 2" /></svg>);
const PanelVIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="3" x2="8" y2="21" opacity="0.4" /><line x1="12" y1="3" x2="12" y2="21" opacity="0.4" /><line x1="16" y1="3" x2="16" y2="21" opacity="0.4" /></svg>);
const PanelHIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="8" x2="21" y2="8" opacity="0.4" /><line x1="3" y1="12" x2="21" y2="12" opacity="0.4" /><line x1="3" y1="16" x2="21" y2="16" opacity="0.4" /></svg>);
const SplitVerticalIcon = ({ count }: { count: number }) => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" opacity="0.2" />{count === 2 && <line x1="12" y1="3" x2="12" y2="21" strokeLinecap="round" />}{count === 3 && (<><line x1="9" y1="3" x2="9" y2="21" strokeLinecap="round" /><line x1="15" y1="3" x2="15" y2="21" strokeLinecap="round" /></>)}</svg>);
const SplitHorizontalIcon = ({ count }: { count: number }) => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" opacity="0.2" />{count === 2 && <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round" />}{count === 3 && (<><line x1="3" y1="9" x2="21" y2="9" strokeLinecap="round" /><line x1="3" y1="15" x2="21" y2="15" strokeLinecap="round" /></>)}</svg>);
const SquareIcon = () => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>);
const FrenchIcon = ({ dir }: { dir: 'left' | 'right' }) => (<svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" opacity="0.2" /><line x1="12" y1="3" x2="12" y2="21" strokeDasharray="3 2" opacity="0.5" />{dir === 'right' ? <><path d="M18 6L12 12L18 18" opacity="0.9" /><path d="M6 6L12 12L6 18" opacity="0.4" strokeDasharray="2 2" /></> : <><path d="M6 6L12 12L6 18" opacity="0.9" /><path d="M18 6L12 12L18 18" opacity="0.4" strokeDasharray="2 2" /></>}</svg>);

const createDefaultLayout = (): WindowNode => ({
  id: 'root',
  type: 'leaf',
  openingType: 'Fixed',
  flex: 1,
  systemType: 'Casement'
});

// --- MAIN COMPONENT ---
export const UnitDesigner = () => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const locationState = (location.state || {}) as { 
    projectDetails?: ProjectDetails, 
    items?: InvoiceItem[],
    editIndex?: number 
  };
  
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  // --- STATE MANAGEMENT ---
  useEffect(() => {
    if (!locationState.projectDetails) navigate('/dashboard', { replace: true });
  }, [locationState, navigate]);

  const [projectDetails] = useState<ProjectDetails>(locationState.projectDetails || {} as ProjectDetails);
  const [projectItems, setProjectItems] = useState<InvoiceItem[]>(locationState.items || []);
  const [editIndex, setEditIndex] = useState<number | undefined>(locationState.editIndex);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const [unitCount, setUnitCount] = useState(1); 
  const [systemMode, setSystemMode] = useState<'Casement' | 'Sliding'>('Casement');
  const [slidingRailMode, setSlidingRailMode] = useState<'Monorail' | 'DoubleRail'>('DoubleRail');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    width: 1500,
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
  const [activeTab, setActiveTab] = useState<'openings' | 'splits' | 'tools'>('openings');
  const [zoomLevel, setZoomLevel] = useState(0.8); 
  const [activeTool, setActiveTool] = useState<{type: 'opening' | 'split', value: string, dir?: string, count?: number} | null>(null);

  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dimensionModal, setDimensionModal] = useState<{ type: 'global' | 'child', dim?: 'w' | 'h', nodeId?: string, childIndex?: number, currentVal: number, totalSize?: number } | null>(null);
  const [dimensionModalValue, setDimensionModalValue] = useState("");
  const [frenchModal, setFrenchModal] = useState<{ nodeId: string, totalWidth: number, activeWidth: number, fixedWidth: number, direction: 'FrenchWindowLeft' | 'FrenchWindowRight' } | null>(null);
  
  
  useEffect(() => {
    if (editIndex !== undefined && editIndex >= 0 && projectItems[editIndex]) {
      const item = projectItems[editIndex];
      setConfig({ ...item.config, layout: item.config.layout || createDefaultLayout(), frameType: item.config.frameType || 'standard' });
      setUnitCount(item.quantity || 1);
      setSelectedNodeId('root');
    } else if (brands.length > 0 && !config.profileId) {
      setConfig(c => ({ ...c, profileId: projectDetails.defaultProfileId || brands[0].id, glassId: glassList[0]?.id || 'double_4_4' }));
    }
  }, [editIndex, projectItems, brands, glassList, projectDetails.defaultProfileId]);
  
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
    if (root.children) return { ...root, children: root.children.map(c => updateNodeInTree(c, id, updater)) };
    return root;
  };

  const getNodeDimensions = (node: WindowNode, targetId: string, w: number, h: number): { w: number, h: number } | null => {
      if (node.id === targetId) return { w, h };
      if (node.type === 'container' && node.children) {
          const totalFlex = node.children.reduce((s, c) => s + (c.flex || 1), 0) || 1;
          for (const child of node.children) {
              const ratio = (child.flex || 1) / totalFlex;
              const childW = node.dir === 'row' ? w * ratio : w;
              const childH = node.dir === 'col' ? h * ratio : h;
              const res = getNodeDimensions(child, targetId, childW, childH);
              if (res) return res;
          }
      }
      return null;
  };

  const handleFrenchModalSubmit = () => {
    if (!frenchModal || !config.layout) return;
    const { nodeId, activeWidth, fixedWidth, direction } = frenchModal;

    pushToHistory(config.layout);

    const targetNode = findNode(config.layout, nodeId);
    if (!targetNode) {
      setFrenchModal(null);
      return;
    }

    const currentSystemType = targetNode.systemType || 'Casement';
    
    // In a French window split, we have one active door-sash and one fixed section
    const activeChild: WindowNode = {
      id: Date.now() + `_active_${Math.random()}`,
      type: 'leaf',
      openingType: direction === 'FrenchWindowLeft' ? 'DoorLeft' : 'DoorRight',
      flex: activeWidth,
      systemType: currentSystemType,
      isFrenchWindow: false
    };

    const fixedChild: WindowNode = {
      id: Date.now() + `_fixed_${Math.random()}`,
      type: 'leaf',
      openingType: 'Fixed',
      flex: fixedWidth,
      systemType: currentSystemType,
      isFrenchWindow: false
    };

    const children: WindowNode[] = direction === 'FrenchWindowLeft' 
      ? [activeChild, fixedChild]
      : [fixedChild, activeChild];

    // Update parent to be a French window container
    setConfig(prev => ({
      ...prev,
      layout: updateNodeInTree(prev.layout!, nodeId, (node) => ({
        ...node,
        type: 'container',
        dir: 'row',
        isFrenchWindow: true,
        children,
        openingType: 'Fixed',
        systemType: currentSystemType
      }))
    }));

    setFrenchModal(null);
  };

  const handleUpdateNode = (id: string, updates: Partial<WindowNode>) => {
    if (!config.layout) return;
    pushToHistory(config.layout);
    setConfig(prev => ({ ...prev, layout: updateNodeInTree(prev.layout!, id, (node) => ({ ...node, ...updates })) }));
  };

  const handleDelete = () => {
     if (!selectedNodeId || !config.layout) return;
     pushToHistory(config.layout);
     setConfig(prev => ({ ...prev, layout: updateNodeInTree(prev.layout!, selectedNodeId, (node) => ({ id: node.id, type: 'leaf', openingType: 'Fixed', flex: 1, systemType: 'Casement' }))}));
  };
  
  const applyTypology = (typology: Typology) => {
      if (!selectedNodeId || !config.layout) return;
      pushToHistory(config.layout);
      const newChildren = typology.openings.map((op, i) => ({ id: Date.now() + `_${i}_${Math.random()}`, type: 'leaf' as const, openingType: op, flex: 1 }));
      handleUpdateNode(selectedNodeId, { type: 'container', dir: 'row', children: newChildren, systemType: 'Sliding', slidingRailType: slidingRailMode });
  };

  const handleCanvasNodeClick = (id: string) => {
      if (activeTool) {
          const targetNode = findNode(config.layout!, id);
          if (!targetNode) return;
          if (activeTool.type === 'opening') {
              if (activeTool.value === 'FrenchWindowLeft' || activeTool.value === 'FrenchWindowRight') {
                  const dims = getNodeDimensions(config.layout!, id, config.width, config.height);
                  if (dims) {
                      const totalW = Math.round(dims.w);
                      setFrenchModal({
                          nodeId: id,
                          totalWidth: totalW,
                          activeWidth: Math.round(totalW * 0.6),
                          fixedWidth: Math.round(totalW - (totalW * 0.6)),
                          direction: activeTool.value as 'FrenchWindowLeft' | 'FrenchWindowRight'
                      });
                      return;
                  }
              }
               handleUpdateNode(id, { openingType: activeTool.value as any, isFrenchWindow: activeTool.value.includes('FrenchWindow') });
          } else if (activeTool.type === 'split') {
              const currentOpeningType = targetNode.openingType || 'Fixed';
              const currentIsFrenchWindow = targetNode.isFrenchWindow || false;
              const currentSystemType = targetNode.systemType || 'Casement';

              if (activeTool.value === 'clear') {
                  handleUpdateNode(id, {
                      type: 'leaf',
                      children: [],
                      dir: undefined,
                      openingType: currentOpeningType,
                      isFrenchWindow: currentIsFrenchWindow,
                      systemType: currentSystemType
                  });
                  return;
              }

              // Check if node is an opening sash (mullion inside sash)
              const isSash = currentOpeningType !== 'Fixed' && !currentOpeningType.includes('Panel');

              const newChildren = Array(activeTool.count || 2).fill(null).map((_, i) => ({
                  id: Date.now() + `_${i}_${Math.random()}`,
                  type: 'leaf' as const,
                  openingType: isSash ? 'Fixed' : currentOpeningType, // If parent is sash, children inside are standard glass dividers (Fixed)
                  flex: 1,
                  systemType: currentSystemType, // Inherit system type from parent
                  isFrenchWindow: isSash ? false : currentIsFrenchWindow,
              })) as WindowNode[];

              handleUpdateNode(id, {
                  type: 'container',
                  dir: activeTool.dir as 'row' | 'col',
                  children: newChildren,
                  openingType: isSash ? currentOpeningType : 'Fixed', // Keep sash on the container itself if it's a sash
                  isFrenchWindow: isSash ? currentIsFrenchWindow : false,
                  systemType: currentSystemType
              });
          }
      } else {
          setSelectedNodeId(id);
      }
  };

  const toggleTool = (tool: any) => {
      setActiveTool(prev => (prev && prev.value === tool?.value && prev.dir === tool?.dir && prev.count === tool?.count) ? null : tool);
  };
  
  const handleGlobalResize = (newValStr: string, dim: 'w' | 'h') => {
      const val = toEnglishDigits(newValStr);
      const num = Number(val);
      if (!isNaN(num)) setConfig(prev => ({ ...prev, [dim === 'w' ? 'width' : 'height']: num }));
  }

  const handleGlobalResizeClick = (dim: 'w' | 'h') => {
      const currentVal = dim === 'w' ? config.width : config.height;
      setDimensionModal({ type: 'global', dim, currentVal });
      setDimensionModalValue(Math.round(currentVal).toString());
  };

  const handleChildResize = (nodeId: string, childIndex: number, currentSize: number, totalSize: number) => {
      setDimensionModal({ type: 'child', nodeId, childIndex, currentVal: currentSize, totalSize });
      setDimensionModalValue(Math.round(currentSize).toString());
  };
  
  const handleDimensionModalSubmit = () => {
      if (!dimensionModal) return;
      const newValStr = dimensionModalValue;
      if (!newValStr) { setDimensionModal(null); return; }
      
      const newVal = Number(toEnglishDigits(newValStr));
      if (isNaN(newVal) || newVal <= 0) {
         setDimensionModal(null);
         return;
      }
      
      if (dimensionModal.type === 'global' && dimensionModal.dim) {
          handleGlobalResize(newValStr, dimensionModal.dim);
      } else if (dimensionModal.type === 'child' && dimensionModal.nodeId && dimensionModal.childIndex !== undefined && dimensionModal.totalSize) {
          if (newVal <= 50 || newVal >= dimensionModal.totalSize - 50) {
             setDimensionModal(null);
             return;
          }
          const node = findNode(config.layout!, dimensionModal.nodeId);
          if (!node || !node.children) { setDimensionModal(null); return; }
          const totalFlex = node.children.reduce((s, c) => s + (c.flex || 1), 0);
          const targetFlex = (newVal / dimensionModal.totalSize) * totalFlex;
          const flexDiff = targetFlex - (node.children[dimensionModal.childIndex].flex || 1);
          let neighborIndex = dimensionModal.childIndex + 1 < node.children.length ? dimensionModal.childIndex + 1 : dimensionModal.childIndex - 1;
          const newChildren = node.children.map((child, idx) => {
              if (idx === dimensionModal.childIndex) return { ...child, flex: targetFlex };
              if (idx === neighborIndex) return { ...child, flex: Math.max(0.1, (child.flex || 1) - flexDiff) };
              return child;
          });
          handleUpdateNode(dimensionModal.nodeId, { children: newChildren });
      }
      setDimensionModal(null);
  };
  
  const handleDragStart = (e: React.DragEvent, type: 'opening' | 'split', value: string, dir?: string, count?: number) => {
      e.dataTransfer.setData('actionType', type); e.dataTransfer.setData('value', value);
      if (dir) e.dataTransfer.setData('dir', dir);
      if (count) e.dataTransfer.setData('count', count.toString());
      e.dataTransfer.effectAllowed = 'copy';
      setActiveTool({ type, value, dir, count });
  };
  const handleDragEnd = () => {};

  const calculateWindowStats = (node: WindowNode, w: number, h: number) => {
    let stats = { sashWindowMeters: 0, sashDoorMeters: 0, mullionMeters: 0, floatingMullionMeters: 0, monorailFrameMeters: 0, glassArea: 0, panelArea: 0, beadMeters: 0, hardware: { Turn: 0, TiltTurn: 0, Sliding: 0, Door: 0 } };
    const processHardware = (type: OpeningDirection | undefined) => { if (type) { if (type.startsWith('Turn')) stats.hardware.Turn++; else if (type.startsWith('TiltTurn')) stats.hardware.TiltTurn++; else if (type.startsWith('Sliding')) stats.hardware.Sliding++; else if (type.startsWith('Door')) stats.hardware.Door++; } };
    if (node.systemType === 'Sliding' && node.children) {
        const numSashes = node.children.length; const overlapsCount = numSashes === 4 ? 2 : (numSashes === 2 ? 1 : 2);
        const leafW = (w - (2 * PROFILE_WIDTH_CONSTANT) + (overlapsCount * SLIDING_OVERLAP)) / numSashes; const leafH = h - (2 * PROFILE_WIDTH_CONSTANT);
        if (node.slidingRailType === 'Monorail') stats.monorailFrameMeters += (w + h) * 2;
        stats.mullionMeters += overlapsCount * leafH;
        node.children.forEach(child => {
            if (child.openingType?.includes('Sliding')) { stats.sashWindowMeters += (leafW + leafH) * 2; processHardware(child.openingType); stats.glassArea += Math.max(0, (leafW - (PROFILE_WIDTH_CONSTANT * 2)) * (leafH - (PROFILE_WIDTH_CONSTANT * 2))); } 
            else if (child.openingType === 'Fixed') { stats.glassArea += Math.max(0, (leafW - 40) * (leafH - 40)); }
            if (child.openingType?.includes('Panel')) { stats.panelArea += leafW * leafH; stats.glassArea = Math.max(0, stats.glassArea - (leafW * leafH)); }
            stats.beadMeters += (leafW + leafH) * 2;
        }); return stats;
    }
    if (node.type === 'container') {
        if (node.openingType && node.openingType !== 'Fixed') { processHardware(node.openingType); const p = (w + h) * 2; if (node.openingType.includes('Door')) stats.sashDoorMeters += p; else stats.sashWindowMeters += p; }
        if (node.children) {
            const totalFlex = node.children.reduce((s, c) => s + (c.flex || 1), 0) || 1;
            if (node.isFrenchWindow) stats.floatingMullionMeters += h; else { if (node.dir === 'row') stats.mullionMeters += (node.children.length - 1) * h; else stats.mullionMeters += (node.children.length - 1) * w; }
            node.children.forEach(child => {
                const ratio = (child.flex || 1) / totalFlex;
                const childW = node.dir === 'row' ? w * ratio : w;
                const childH = node.dir === 'col' ? h * ratio : h;
                const childStats = calculateWindowStats(child, childW, childH);
                Object.keys(childStats).forEach(key => { const k = key as keyof typeof stats; if (k === 'hardware') { (Object.keys(childStats.hardware) as Array<keyof typeof stats.hardware>).forEach(hk => { stats.hardware[hk] += childStats.hardware[hk]; }); } else { (stats as any)[k] += (childStats as any)[k]; } });
            });
        }
    } else {
        if (node.openingType && node.openingType !== 'Fixed' && !node.openingType.includes('Panel')) { processHardware(node.openingType); const p = (w + h) * 2; if (node.openingType.includes('Door')) stats.sashDoorMeters += p; else stats.sashWindowMeters += p; }
        if (node.openingType?.includes('Panel')) stats.panelArea += w * h; else stats.glassArea += w * h;
        stats.beadMeters += (w + h) * 2;
    } return stats;
  };

  const calculatePrice = () => {
    if (!config.layout) return { profileMeters: 0, profilePrice: 0, glassArea: 0, glassPrice: 0, sashCount: 0, hardwarePrice: 0, totalPrice: 0, unitPrice: 0, details: [] };
    const stats = calculateWindowStats(config.layout, config.width, config.height);
    const m = (val: number) => val / 1000, a = (val: number) => val / 1000000;
    const fM = stats.monorailFrameMeters > 0 ? 0 : m((config.width + config.height) * 2), mfM = m(stats.monorailFrameMeters), muM = m(stats.mullionMeters), flM = m(stats.floatingMullionMeters), sWM = m(stats.sashWindowMeters), sDM = m(stats.sashDoorMeters), bM = m(stats.beadMeters), gA = a(stats.glassArea), pA = a(stats.panelArea);
    const galoM = fM + mfM + muM + flM + sWM + sDM;
    const brand = brands.find(b => b.id === config.profileId), glassType = glassList.find(g => g.id === config.glassId), hwItems = pricingStore.getHardware(), panelType = hwItems.find(h => h.id === 'panel_upvc'), panelPrice = panelType?.pricePerSet || 1500000;
    const getPrice = (id: string, def: number) => brand?.components.find(c => c.id === id)?.price || def;
    const fP = getPrice(config.frameType === 'renovation' ? 'renovation' : 'frame', 0), mP = getPrice('monorail_frame', 0), muP = getPrice('mullion', 0), flP = getPrice('floating_mullion', 0), sWP = getPrice('sash_window', 0), sDP = getPrice('sash_door', 0), bP = getPrice('bead', 60000), galoP = getPrice('galvanized', 150000), gP = glassType?.pricePerSqm || 0;
    const details: InvoiceDetail[] = [];
    let rowId = 1;
    const addDetail = (name: string, q: number, u: string, up: number) => { if (q > 0) details.push({ rowId: rowId++, name, unit: u, quantity: Number(q.toFixed(2)), unitPrice: up, totalPrice: Math.round(q * up) }); };
    addDetail(config.frameType === 'renovation' ? 'پروفیل فریم بازسازی' : 'پروفیل فریم', fM, 'متر', fP); addDetail('فریم کشویی تک‌ریل', mfM, 'متر', mP); addDetail('پروفیل سش بازشو', sWM, 'متر', sWP); addDetail('پروفیل سش درب', sDM, 'متر', sDP); addDetail('مولیون و Interlock', muM, 'متر', muP); addDetail('مولیون متحرک', flM, 'متر', flP); addDetail(glassType?.name || 'شیشه', gA, 'مترمربع', gP); addDetail('پنل UPVC', pA, 'مترمربع', panelPrice); addDetail('زهوار', bM, 'متر', bP); addDetail('گالوانیزه تقویتی', galoM, 'متر', galoP);
    let hwTotal = 0; const hwBrands = pricingStore.getHardwareBrands();
    [{type: 'Turn', lbl: 'تک‌حالته'}, {type: 'TiltTurn', lbl: 'دو‌حالته'}, {type: 'Sliding', lbl: 'کشویی'}, {type: 'Door', lbl: 'درب'}].forEach(h => { if(stats.hardware[h.type as keyof typeof stats.hardware] > 0) { const match = hwItems.find(i => i.type === h.type); const brand = hwBrands.find(b => b.id === match?.brandId); const price = match?.pricePerSet || 0; const q = stats.hardware[h.type as keyof typeof stats.hardware]; hwTotal += q * price; addDetail(`یراق ${h.lbl} برند ${brand?.name || ''}`, q, 'دست', price); } });
    const unitPrice = details.reduce((acc, d) => acc + d.totalPrice, 0);
    return { profileMeters: Number(galoM.toFixed(2)), profilePrice: Math.round(unitPrice - (gA * gP + pA * panelPrice + hwTotal)), glassArea: Number(gA.toFixed(2)), glassPrice: Math.round(gA * gP + pA * panelPrice), sashCount: Object.values(stats.hardware).reduce((a,b)=>a+b,0), hardwarePrice: Math.round(hwTotal), totalPrice: unitPrice, unitPrice, details };
  };

  const handleAddToList = () => {
      const calculations = calculatePrice();
      const newItem: InvoiceItem = { id: Date.now().toString(), config: { ...config }, quantity: unitCount, calculations };
      const updatedItems = [...projectItems];
      if (editIndex !== undefined) updatedItems[editIndex] = newItem; else updatedItems.push(newItem);
      const totalMaterialPrice = updatedItems.reduce((acc, i) => acc + (i.calculations.totalPrice * i.quantity), 0);
      const finalProjectPrice = totalMaterialPrice + Math.round(totalMaterialPrice * (projectDetails.installPercent / 100));
      const projectToSave = { ...projectDetails, items: updatedItems, totalPrice: finalProjectPrice };
      pricingStore.saveProject(projectToSave); setProjectItems(updatedItems); setLastSavedId(newItem.id);
      if (editIndex !== undefined) navigate('/breakdown', { state: { projectDetails, items: updatedItems } });
      else { setConfig(prev => ({ ...prev, id: Date.now().toString(), width: 1500, height: 1500, layout: createDefaultLayout() })); setUnitCount(1); setHistory([]); setFuture([]); setSelectedNodeId('root'); setTimeout(() => setLastSavedId(null), 2000); }
  };
  
  const fitToScreen = () => {
    if (!canvasAreaRef.current) return;
    
    // We get the available viewing area (subtracting some small safety margins)
    const availableW = canvasAreaRef.current.clientWidth;
    const availableH = canvasAreaRef.current.clientHeight;
    
    // Use dynamic padding to maximize size on mobile screen
    const currentPadding = isDesktop ? 30 : 10;
    
    // We calculate the *actual* content size including the known padding from WindowCanvas
    // This makes the scale calculation precise.
    const contentW = config.width + (currentPadding * 2);
    const contentH = config.height + (currentPadding * 2);
    
    if (availableW <= 0 || availableH <= 0) return;

    const scaleW = availableW / contentW;
    const scaleH = availableH / contentH;
    
    // We choose the smaller scale to fit both dimensions safely
    let scale = Math.min(scaleW, scaleH);
    if (isDesktop) {
      scale = scale * 0.80;
    } else {
      // On mobile mode, scale to fit both width/height comfortably with a 10% safety margin
      // so it never overflows or requires excessive scrolling/zooming.
      scale = scale * 0.80;
    }
    
    // Clamp values to sane limits (e.g., don't zoom out to microscopic or zoom in infinitely)
    setZoomLevel(Math.min(Math.max(scale, 0.1), 3.5));
  };
  
  useEffect(() => { fitToScreen(); window.addEventListener('resize', fitToScreen); return () => window.removeEventListener('resize', fitToScreen); }, [config.width, config.height, isDesktop]);

  const renderDesktop = () => {
    return (
        <div className="h-screen flex flex-col bg-slate-100 font-sans overflow-hidden">
            <div className="bg-slate-900 px-4 py-2 flex justify-between items-center z-30 shadow-md shrink-0 h-14">
                <div className="flex gap-2 items-center">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors">
                        <ArrowRight size={20} />
                    </button>
                    <div className="w-px h-6 bg-white/10"></div>
                    <h1 className="font-bold text-white text-md mx-2">{t('unit_design')}</h1>
                    <p className="text-[10px] text-white/40 font-mono">{projectDetails.customerName}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleUndo} disabled={history.length === 0} className="px-3 py-2 text-xs bg-white/10 text-white/70 rounded-lg disabled:opacity-30 flex items-center gap-1.5"><Undo size={14} /> Undo</button>
                    <button onClick={handleRedo} disabled={future.length === 0} className="px-3 py-2 text-xs bg-white/10 text-white/70 rounded-lg disabled:opacity-30 flex items-center gap-1.5"><Redo size={14} /> Redo</button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className={`bg-slate-800 text-white z-20 shadow-lg flex flex-col shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-[240px]'}`}>
                    <div className="p-2 flex items-center justify-between border-b border-slate-700">
                        {!isSidebarCollapsed && <span className="px-2 text-xs font-bold text-slate-400">TOOLBOX</span>}
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg">
                            {isSidebarCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                        </button>
                    </div>
                    <div className="flex border-b border-slate-700">
                        <button onClick={() => setSystemMode('Casement')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-xs font-bold transition-all ${systemMode === 'Casement' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                            <Sidebar size={16} /> {!isSidebarCollapsed && 'لولایی'}
                        </button>
                        <button onClick={() => setSystemMode('Sliding')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-xs font-bold transition-all ${systemMode === 'Sliding' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                            <Monitor size={16} /> {!isSidebarCollapsed && 'کشویی'}
                        </button>
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex border-b border-slate-700 bg-slate-800/50">
                            <button onClick={() => setActiveTab('openings')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'openings' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400'}`}>{t('opening')}</button>
                            <button onClick={() => setActiveTab('splits')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'splits' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400'}`}>{t('splits')}</button>
                            <button onClick={() => setActiveTab('tools')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'tools' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400'}`}>{t('tools')}</button>
                        </div>
                    )}
                    <div className="p-3 flex-1 overflow-y-auto no-scrollbar">
                        <div className={`grid gap-2 ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-3'}`}>
                             {activeTab === 'openings' && systemMode === 'Casement' && (
                                <>
                                <DraggableIcon type="opening" value="Fixed" label={t('fixed')} icon={<FixedIcon />} isActive={activeTool?.value === 'Fixed'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true} />
                                <DraggableIcon type="opening" value="TurnRight" label={t('turn_right')} icon={<TurnRightIcon />} isActive={activeTool?.value === 'TurnRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="TurnLeft" label={t('turn_left')} icon={<TurnLeftIcon />} isActive={activeTool?.value === 'TurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="TiltTurnRight" label={t('tilt_turn_right')} icon={<TiltTurnRightIcon />} isActive={activeTool?.value === 'TiltTurnRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="TiltTurnLeft" label={t('tilt_turn_left')} icon={<TiltTurnLeftIcon />} isActive={activeTool?.value === 'TiltTurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="Awning" label="کلنگی رو به بالا" icon={<AwningIcon />} isActive={activeTool?.value === 'Awning'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="Hopper" label="کلنگی رو به پایین" icon={<HopperIcon />} isActive={activeTool?.value === 'Hopper'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="FrenchWindowRight" label="فرانسوی (راست)" icon={<FrenchIcon dir="right"/>} isActive={activeTool?.value === 'FrenchWindowRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="FrenchWindowLeft" label="فرانسوی (چپ)" icon={<FrenchIcon dir="left"/>} isActive={activeTool?.value === 'FrenchWindowLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="DoorRight" label="درب (راست)" icon={<DoorRightIcon />} isActive={activeTool?.value === 'DoorRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="DoorLeft" label="درب (چپ)" icon={<DoorLeftIcon />} isActive={activeTool?.value === 'DoorLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="PanelV" label="پنل عمودی" icon={<PanelVIcon />} isActive={activeTool?.value === 'PanelV'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="opening" value="PanelH" label="پنل افقی" icon={<PanelHIcon />} isActive={activeTool?.value === 'PanelH'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                </>
                             )}
                              {activeTab === 'openings' && systemMode === 'Sliding' && (
                                <div className="col-span-full space-y-2">
                                      {Object.entries(SLIDING_DATA[slidingRailMode]).map(([category, typologies]) => (
                                          <div key={category} className="flex flex-col gap-1">
                                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{category}</span>
                                              <div className="grid grid-cols-3 gap-2">
                                                  {typologies.map(t => (<TypologyIcon key={t.id} typology={t} isActive={false} onClick={applyTypology} />))}
                                              </div>
                                          </div>
                                      ))}
                                </div>
                             )}
                             {activeTab === 'splits' && (
                                <>
                                <DraggableIcon type="split" dir="row" count={2} label={t('split_v_2')} icon={<SplitVerticalIcon count={2} />} isActive={activeTool?.dir === 'row' && activeTool.count === 2} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="split" dir="col" count={2} label={t('split_h_2')} icon={<SplitHorizontalIcon count={2} />} isActive={activeTool?.dir === 'col' && activeTool.count === 2} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="split" dir="row" count={3} label={t('split_v_3')} icon={<SplitVerticalIcon count={3} />} isActive={activeTool?.dir === 'row' && activeTool.count === 3} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="split" dir="col" count={3} label={t('split_h_3')} icon={<SplitHorizontalIcon count={3} />} isActive={activeTool?.dir === 'col' && activeTool.count === 3} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <DraggableIcon type="split" dir="row" count={1} value="clear" label={t('clear_split')} icon={<SquareIcon />} isActive={activeTool?.value === 'clear'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                </>
                             )}
                              {activeTab === 'tools' && (
                                <>
                                <ToolBtn icon={Trash2} label={t('delete_item')} color="text-red-400" onClick={handleDelete} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                <ToolBtn icon={MousePointer2} label={t('select')} onClick={() => toggleTool(null)} isActive={activeTool === null} isCollapsed={isSidebarCollapsed} isDark={true}/>
                                </>
                             )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative bg-white overflow-hidden flex flex-col min-h-0" ref={canvasAreaRef}>
                    <div className="flex-1 overflow-auto flex items-center justify-center p-1 cursor-default">
                        <div
                            style={{
                                width: (config.width + 60) * zoomLevel,
                                height: (config.height + 60) * zoomLevel,
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <div 
                                className="transition-transform duration-300 ease-out origin-center" 
                                style={{ 
                                    transform: `scale(${zoomLevel})`,
                                    width: config.width + 60, // Explicit dimensions for correct scaling
                                    height: config.height + 60,
                                    position: 'absolute'
                                }}
                            >
                                <div className="relative select-none w-full h-full">
                                    {config.layout && (
                                        <WindowCanvas 
                                            node={config.layout} 
                                            selectedId={selectedNodeId} 
                                            onSelect={handleCanvasNodeClick} 
                                            onUpdateNode={handleUpdateNode} 
                                            onChildResize={handleChildResize} 
                                            onGlobalResize={handleGlobalResizeClick}
                                            width={config.width} 
                                            height={config.height} 
                                            isRoot={true} 
                                            frameType={config.frameType} 
                                            canvasPadding={30}
                                            readOnly={false}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.05) 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white rounded-lg shadow-md p-1">
                        <button onClick={() => setZoomLevel((z: number) => Math.min(z + 0.1, 4))} className="p-2 text-slate-600 hover:bg-slate-100 rounded"><ZoomIn size={20}/></button>
                        <button onClick={fitToScreen} className="p-2 text-slate-600 hover:bg-slate-100 rounded" title="Fit to Screen"><RefreshCcw size={16}/></button>
                        <button onClick={() => setZoomLevel((z: number) => Math.max(z - 0.1, 0.1))} className="p-2 text-slate-600 hover:bg-slate-100 rounded"><ZoomOut size={20}/></button>
                    </div>
                </div>

                <div className="w-[240px] bg-white shadow-lg z-10 shrink-0 border-l border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-200">
                        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-widest">Inspector</h2>
                        <p className="text-[10px] text-slate-400 font-bold">Properties & Dimensions</p>
                    </div>
                    <div className="p-4 flex-1 space-y-4 overflow-y-auto">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <label className="text-xs font-bold text-slate-400">Global Dimensions</label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <InputField label="عرض (mm)" type="number" value={config.width} onChange={(e: any) => handleGlobalResize(e.target.value, 'w')} />
                                <InputField label="ارتفاع (mm)" type="number" value={config.height} onChange={(e: any) => handleGlobalResize(e.target.value, 'h')} />
                            </div>
                        </div>
                        <SelectField label="برند پروفیل" value={config.profileId} onChange={(e:any) => setConfig({ ...config, profileId: e.target.value })} options={brands.map((b: any) => ({ label: b.name, value: b.id }))}/>
                        <SelectField label="نوع شیشه" value={config.glassId} onChange={(e:any) => setConfig({ ...config, glassId: e.target.value })} options={glassList.map((g: any) => ({ label: g.name, value: g.id }))} />
                        <SelectField label="نوع فریم" value={config.frameType || 'standard'} onChange={(e:any) => setConfig({ ...config, frameType: e.target.value })} options={[{ label: 'فریم استاندارد', value: 'standard' }, { label: 'فریم بازسازی', value: 'renovation' }]} />
                    </div>
                    <div className="p-4 border-t border-slate-200 flex flex-col gap-3">
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-600 px-2">تعداد</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setUnitCount((p: number) => Math.max(1, p - 1))} className="p-2 bg-white text-slate-700 rounded-lg shadow-sm border border-slate-200 flex shrink-0 items-center justify-center h-8 w-8"><Minus size={16} /></button>
                                <span className="font-black text-slate-800 text-sm w-6 text-center">{toPersianDigits(unitCount)}</span>
                                <button onClick={() => setUnitCount((p: number) => p + 1)} className="p-2 bg-white text-slate-700 rounded-lg shadow-sm border border-slate-200 flex shrink-0 items-center justify-center h-8 w-8"><Plus size={16} /></button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <PrimaryButton fullWidth onClick={handleAddToList}>
                                    {editIndex !== undefined ? 'ذخیره تغییرات' : 'افزودن به فاکتور'}
                                </PrimaryButton>
                            </div>
                            {(projectItems.length > 0 || lastSavedId) && (
                                <button onClick={() => navigate('/breakdown', { state: { projectDetails, items: projectItems } })} className="h-10 w-10 flex shrink-0 items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                    <Receipt size={20}/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };
  
  const renderMobile = () => {
    return (
        <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
            <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center z-30 shadow-sm border-b border-slate-200 shrink-0">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-lg text-slate-600"><ArrowRight size={20} /></button>
                <div className="text-center">
                    <h1 className="font-bold text-slate-800 text-sm">{t('unit_design')}</h1>
                    <p className="text-[10px] text-slate-500">{projectDetails.customerName}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleUndo} disabled={history.length === 0} className="p-2 bg-slate-100 rounded text-slate-600 disabled:opacity-30"><Undo size={18} /></button>
                    <button onClick={handleRedo} disabled={future.length === 0} className="p-2 bg-slate-100 rounded text-slate-600 disabled:opacity-30"><Redo size={18} /></button>
                </div>
            </div>
            
            <div className="bg-white px-2 py-1 shadow-sm border-b border-slate-200 shrink-0 no-scrollbar overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                    <ToolBtn icon={systemMode === 'Casement' ? Monitor : Sidebar} label={systemMode === 'Casement' ? 'کشویی' : 'لولایی'} onClick={() => { setSystemMode((prev: 'Casement' | 'Sliding') => prev === 'Casement' ? 'Sliding' : 'Casement'); toggleTool(null); }} isCollapsed={true}/>
                    <div className="w-px h-10 bg-slate-200 mx-1"></div>

                    {systemMode === 'Casement' ? (
                        <>
                            <DraggableIcon type="opening" value="Fixed" label={t('fixed')} icon={<FixedIcon />} isActive={activeTool?.value === 'Fixed'} onClick={toggleTool} isCollapsed={true} />
                            <DraggableIcon type="opening" value="TurnRight" label={t('turn_right')} icon={<TurnRightIcon />} isActive={activeTool?.value === 'TurnRight'} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="opening" value="TurnLeft" label={t('turn_left')} icon={<TurnLeftIcon />} isActive={activeTool?.value === 'TurnLeft'} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="opening" value="TiltTurnRight" label={t('tilt_turn_right')} icon={<TiltTurnRightIcon />} isActive={activeTool?.value === 'TiltTurnRight'} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="opening" value="TiltTurnLeft" label={t('tilt_turn_left')} icon={<TiltTurnLeftIcon />} isActive={activeTool?.value === 'TiltTurnLeft'} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="opening" value="Awning" label="کلنگی رو به بالا" icon={<AwningIcon />} isActive={activeTool?.value === 'Awning'} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="opening" value="Hopper" label="کلنگی رو به پایین" icon={<HopperIcon />} isActive={activeTool?.value === 'Hopper'} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="opening" value="FrenchWindowRight" label="فرانسوی (راست)" icon={<FrenchIcon dir="right"/>} isActive={activeTool?.value === 'FrenchWindowRight'} onClick={toggleTool} isCollapsed={true} />
                            <DraggableIcon type="opening" value="FrenchWindowLeft" label="فرانسوی (چپ)" icon={<FrenchIcon dir="left"/>} isActive={activeTool?.value === 'FrenchWindowLeft'} onClick={toggleTool} isCollapsed={true} />
                            <DraggableIcon type="opening" value="DoorRight" label="درب (راست)" icon={<DoorRightIcon />} isActive={activeTool?.value === 'DoorRight'} onClick={toggleTool} isCollapsed={true} />
                            <DraggableIcon type="opening" value="DoorLeft" label="درب (چپ)" icon={<DoorLeftIcon />} isActive={activeTool?.value === 'DoorLeft'} onClick={toggleTool} isCollapsed={true} />
                            <DraggableIcon type="opening" value="PanelV" label="پنل عمودی" icon={<PanelVIcon />} isActive={activeTool?.value === 'PanelV'} onClick={toggleTool} isCollapsed={true} />
                            <DraggableIcon type="opening" value="PanelH" label="پنل افقی" icon={<PanelHIcon />} isActive={activeTool?.value === 'PanelH'} onClick={toggleTool} isCollapsed={true} />
                            <div className="w-px h-10 bg-slate-200 mx-1"></div>
                            <DraggableIcon type="split" dir="row" count={2} label={t('split_v_2')} icon={<SplitVerticalIcon count={2} />} isActive={activeTool?.dir === 'row' && activeTool.count === 2} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="split" dir="col" count={2} label={t('split_h_2')} icon={<SplitHorizontalIcon count={2} />} isActive={activeTool?.dir === 'col' && activeTool.count === 2} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="split" dir="row" count={3} label={t('split_v_3')} icon={<SplitVerticalIcon count={3} />} isActive={activeTool?.dir === 'row' && activeTool.count === 3} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="split" dir="col" count={3} label={t('split_h_3')} icon={<SplitHorizontalIcon count={3} />} isActive={activeTool?.dir === 'col' && activeTool.count === 3} onClick={toggleTool} isCollapsed={true}/>
                            <DraggableIcon type="split" dir="row" count={1} value="clear" label={t('clear_split')} icon={<SquareIcon />} isActive={activeTool?.value === 'clear'} onClick={toggleTool} isCollapsed={true}/>
                        </>
                    ) : (
                        <div className="flex items-center gap-1">
                           {SLIDING_DATA[slidingRailMode]['2-Sash'].map(t => <div key={t.id} className="transform scale-90"><TypologyIcon typology={t} isActive={false} onClick={applyTypology} /></div>)}
                           {SLIDING_DATA[slidingRailMode]['3-Sash'].map(t => <div key={t.id} className="transform scale-90"><TypologyIcon typology={t} isActive={false} onClick={applyTypology} /></div>)}
                        </div>
                    )}

                    <div className="w-px h-10 bg-slate-200 mx-1"></div>
                    <ToolBtn icon={Trash2} label={t('delete_item')} color="text-red-400" onClick={handleDelete} isCollapsed={true}/>
                    <ToolBtn icon={MousePointer2} label={t('select')} onClick={() => toggleTool(null)} isActive={activeTool === null} isCollapsed={true}/>
                </div>
            </div>

            <div className="flex-1 relative bg-white overflow-hidden flex flex-col min-h-0" ref={canvasAreaRef}>
                <div 
                    className="flex-1 overflow-auto flex items-center justify-center p-1 cursor-default"
                    style={{ paddingBottom: '94px' }}
                >
                    <div
                        style={{
                            width: (config.width + 20) * zoomLevel,
                            height: (config.height + 20) * zoomLevel,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <div 
                            className="transition-transform duration-300 ease-out origin-center" 
                            style={{ 
                                transform: `scale(${zoomLevel})`,
                                width: config.width + 20,
                                height: config.height + 20,
                                position: 'absolute'
                            }}
                        >
                            <div className="relative select-none w-full h-full">
                                {config.layout && (
                                    <WindowCanvas 
                                        node={config.layout} 
                                        selectedId={selectedNodeId} 
                                        onSelect={handleCanvasNodeClick} 
                                        onUpdateNode={handleUpdateNode} 
                                        onGlobalResize={handleGlobalResizeClick}
                                        width={config.width} 
                                        height={config.height} 
                                        isRoot={true} 
                                        frameType={config.frameType} 
                                        canvasPadding={10}
                                        readOnly={false}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.05) 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white/80 backdrop-blur rounded-lg shadow-md p-1">
                    <button onClick={() => setZoomLevel((z: number) => Math.min(z + 0.1, 4))} className="p-2 text-slate-600"><ZoomIn size={20}/></button>
                    <button onClick={fitToScreen} className="p-2 text-slate-600"><RefreshCcw size={16}/></button>
                    <button onClick={() => setZoomLevel((z: number) => Math.max(z - 0.1, 0.1))} className="p-2 text-slate-600"><ZoomOut size={20}/></button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
                <div className="max-w-xl mx-auto flex items-center gap-2 pointer-events-auto">
                    <button onClick={() => setIsPanelOpen(!isPanelOpen)} className={`h-14 w-14 flex items-center justify-center rounded-full transition-all shadow-xl border border-white/20 ${isPanelOpen ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}>
                        {isPanelOpen ? <ChevronDown size={24}/> : <SlidersHorizontal size={22}/>}
                    </button>
                    <div className="flex-1 flex gap-2 h-14 bg-white/95 backdrop-blur-xl border border-white/40 p-1.5 rounded-full shadow-2xl">
                        <div className="flex items-center bg-slate-100 rounded-full px-2 py-1 border border-slate-200">
                            <button onClick={() => setUnitCount((p: number) => Math.max(1, p - 1))} className="p-1.5 bg-white text-slate-700 rounded-full shadow-sm"><Minus size={14} /></button>
                            <div className="w-10 text-center"><span className="text-xs font-black text-slate-800">{toPersianDigits(unitCount)}</span></div>
                            <button onClick={() => setUnitCount((p: number) => p + 1)} className="p-1.5 bg-white text-slate-700 rounded-full shadow-sm"><Plus size={14} /></button>
                        </div>
                        <button onClick={handleAddToList} className={`flex-1 rounded-full text-[10px] font-black flex items-center justify-center gap-2 transition-all ${lastSavedId ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}>
                            {lastSavedId ? <Check size={16}/> : <PlusCircle size={16}/>} {editIndex !== undefined ? 'تایید' : 'افزودن'}
                        </button>
                        {(projectItems.length > 0 || lastSavedId) && (
                            <button onClick={() => navigate('/breakdown', { state: { projectDetails, items: projectItems } })} className="flex-[1.5] bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"><Receipt size={16}/> فاکتور</button>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isPanelOpen && (
                     <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed bottom-24 left-4 right-4 z-30 p-6 bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-2xl space-y-4">
                         <div className="grid grid-cols-2 gap-2">
                             <InputField label="عرض (mm)" type="number" value={config.width} onChange={(e: any) => handleGlobalResize(e.target.value, 'w')} />
                             <InputField label="ارتفاع (mm)" type="number" value={config.height} onChange={(e: any) => handleGlobalResize(e.target.value, 'h')} />
                         </div>
                         <SelectField label="نوع شیشه" value={config.glassId} onChange={(e:any) => setConfig({ ...config, glassId: e.target.value })} options={glassList.map((g: any) => ({ label: g.name, value: g.id }))} />
                         <SelectField label="نوع فریم" value={config.frameType || 'standard'} onChange={(e:any) => setConfig({ ...config, frameType: e.target.value })} options={[{ label: 'فریم استاندارد', value: 'standard' }, { label: 'فریم بازسازی', value: 'renovation' }]} />
                     </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
  };
  
  const renderDimensionModalDialog = () => {
    if (!dimensionModal) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-800 mb-4">{dimensionModal.type === 'global' ? 'تغییر ابعاد' : 'تغییر اندازه فریم'}</h3>
                <InputField 
                    label={`اندازه جدید ${dimensionModal.type === 'global' ? (dimensionModal.dim === 'w' ? 'عرض' : 'ارتفاع') : ''} (mm)`} 
                    type="number" 
                    value={dimensionModalValue} 
                    onChange={(e: any) => setDimensionModalValue(e.target.value)} 
                />
                <div className="flex gap-2 mt-6">
                    <button className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-all" onClick={() => setDimensionModal(null)}>انصراف</button>
                    <PrimaryButton className="flex-1 !py-3" onClick={handleDimensionModalSubmit}>تایید</PrimaryButton>
                </div>
            </div>
        </div>
    );
  };

  const renderFrenchModalDialog = () => {
    if (!frenchModal) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setFrenchModal(null)}>
            <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-800 mb-2 text-right">تنظیم ابعاد بازشوی فرانسوی</h3>
                <p className="text-xs text-slate-400 mb-4 text-right">اندازه لنگه‌های فعال (متحرک) و ثابت را مشخص کنید.</p>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">عرض کل فریم</span>
                    <span className="text-sm font-black text-slate-800 leading-snug font-mono mt-0.5 block">{frenchModal.totalWidth} mm</span>
                </div>

                <div className="space-y-4">
                    <InputField 
                        label="عرض قسمت بازشو (متحرک) (mm)" 
                        type="number" 
                        value={frenchModal.activeWidth.toString()} 
                        onChange={(e: any) => {
                            const val = Number(toEnglishDigits(e.target.value));
                            if (!isNaN(val)) {
                                setFrenchModal(prev => prev ? {
                                    ...prev,
                                    activeWidth: val,
                                    fixedWidth: prev.totalWidth - val
                                } : null);
                            }
                        }} 
                    />
                    
                    <InputField 
                        label="عرض قسمت ثابت (mm)" 
                        type="number" 
                        value={frenchModal.fixedWidth.toString()} 
                        onChange={(e: any) => {
                            const val = Number(toEnglishDigits(e.target.value));
                            if (!isNaN(val)) {
                                setFrenchModal(prev => prev ? {
                                    ...prev,
                                    fixedWidth: val,
                                    activeWidth: prev.totalWidth - val
                                } : null);
                            }
                        }} 
                    />
                </div>

                { (frenchModal.activeWidth < 150 || frenchModal.fixedWidth < 150) && (
                    <p className="text-[11px] text-red-500 font-bold mt-2 text-right">حداقل عرض برای هر لنگه ۱۵۰ میلی‌متر است.</p>
                )}

                <div className="flex gap-2 mt-6">
                    <button 
                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-all text-sm" 
                        onClick={() => setFrenchModal(null)}
                    >
                        انصراف
                    </button>
                    <PrimaryButton 
                        className="flex-1 !py-3 text-sm font-semibold" 
                        disabled={frenchModal.activeWidth < 150 || frenchModal.fixedWidth < 150 || (frenchModal.activeWidth + frenchModal.fixedWidth !== frenchModal.totalWidth)}
                        onClick={handleFrenchModalSubmit}
                    >
                        تایید
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
  };
  
  return (
    <>
      {isDesktop ? renderDesktop() : renderMobile()}
      {renderDimensionModalDialog()}
      {renderFrenchModalDialog()}
    </>
  );
};
