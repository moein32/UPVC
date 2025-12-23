
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Save, Trash2, SplitSquareHorizontal, SplitSquareVertical, PlusCircle, Maximize, ZoomIn, ZoomOut, RefreshCcw, Hand, MousePointer2, Receipt, Check, Edit3, Grid, XCircle, Undo, Redo, LayoutTemplate, Home, Box, Layers, Settings, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputField, SelectField, PrimaryButton } from '../components/UIComponents';
import { WindowCanvas } from '../components/WindowCanvas';
import { WindowConfig, ProjectDetails, InvoiceItem, ProfileBrand, GlassType, HardwareItem, WindowNode, OpeningDirection, InvoiceDetail } from '../types';
import { pricingStore } from '../services/pricingStore';
import { toPersianDigits, formatPrice, toEnglishDigits } from '../utils/formatting';

// --- Helper Components for Toolbar ---

const DraggableIcon = ({ type, value, dir, count, label, icon, isActive, onClick, onDragStart, onDragEnd }: any) => {
  return (
    <div 
      className={`
        flex flex-col items-center justify-center gap-1 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all select-none
        ${isActive ? 'bg-orange-500 text-white shadow-lg scale-105' : 'hover:bg-slate-700 text-slate-300'}
      `}
      draggable
      onDragStart={(e) => onDragStart(e, type, value, dir, count)}
      onDragEnd={onDragEnd}
      onClick={() => onClick({ type, value, dir, count })}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[9px] font-medium max-w-[50px] text-center leading-tight">{label}</span>
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
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    {dir === 'left' ? <path d="M15 12H9M9 12L12 9M9 12L12 15" /> : <path d="M9 12H15M15 12L12 9M15 12L12 15" />}
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

const SplitVerticalIcon = ({ count }: { count: number }) => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    {count === 2 && <line x1="12" y1="3" x2="12" y2="21" />}
    {count === 3 && (
      <>
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="15" x2="15" y2="21" />
      </>
    )}
  </svg>
);

const SplitHorizontalIcon = ({ count }: { count: number }) => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    {count === 2 && <line x1="3" y1="12" x2="21" y2="12" />}
    {count === 3 && (
      <>
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </>
    )}
  </svg>
);

const SquareIcon = () => (
  <svg viewBox="0 0 24 24" className="w-full h-full stroke-current fill-none" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

// --- Default Data ---
const createDefaultLayout = (): WindowNode => ({
  id: 'root',
  type: 'leaf',
  openingType: 'Fixed',
  flex: 1
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

  // --- UI Control State ---
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // --- External Data ---
  const [brands, setBrands] = useState<ProfileBrand[]>([]);
  const [glassList, setGlassList] = useState<GlassType[]>([]);
  const [hardwareList, setHardwareList] = useState<HardwareItem[]>([]);

  useEffect(() => {
    setBrands(pricingStore.getBrands());
    setGlassList(pricingStore.getGlass());
    setHardwareList(pricingStore.getHardware());
  }, []);

  // --- Configuration State ---
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

  // --- Undo/Redo History ---
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

  // --- Responsive Auto-Fit Logic ---
  const fitToScreen = () => {
    if (!canvasAreaRef.current) return;
    const padding = 70; 
    const areaW = canvasAreaRef.current.clientWidth - padding;
    const areaH = canvasAreaRef.current.clientHeight - padding;
    if (areaW <= 0 || areaH <= 0) return;
    const baseW = config.width / 4;
    const baseH = config.height / 4;
    const scaleW = areaW / baseW;
    const scaleH = areaH / baseH;
    const newZoom = Math.min(scaleW, scaleH) * 1.05; 
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

  // Load Edit Data
  useEffect(() => {
    if (editIndex !== undefined && editIndex >= 0 && projectItems[editIndex]) {
      const item = projectItems[editIndex];
      setConfig({
        ...item.config,
        layout: item.config.layout || createDefaultLayout(),
        frameType: item.config.frameType || 'standard'
      });
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

  // --- Tree Logic ---
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
         id: node.id, type: 'leaf', openingType: 'Fixed', flex: 1
       }))
     }));
  };

  const handleCanvasNodeClick = (id: string) => {
      if (activeTool) {
          const targetNode = findNode(config.layout!, id);
          if (!targetNode) return;
          if (activeTool.type === 'opening') {
               handleUpdateNode(id, { openingType: activeTool.value as any });
               setActiveTool(null);
          } else if (activeTool.type === 'split') {
              if (targetNode.type === 'leaf') {
                  const count = activeTool.count || 2;
                  const existingOpening = (targetNode.openingType as string) === 'Panel' ? 'Fixed' : targetNode.openingType;
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
                      openingType: (existingOpening && existingOpening !== 'Fixed' && existingOpening !== 'Panel') ? existingOpening : undefined
                  });
                  setActiveTool(null);
              }
          }
      } else {
          setSelectedNodeId(id);
      }
  };

  const toggleTool = (tool: any) => {
      if (activeTool && activeTool.value === tool.value && activeTool.type === tool.type) {
          setActiveTool(null);
      } else {
          setActiveTool(tool);
      }
  };

  const handleDragEnd = () => {
    setTimeout(() => {
        setActiveTool(null);
    }, 100);
  };

  const calculateNodeDimensions = (node: WindowNode, w: number, h: number, targetId: string): {w: number, h: number} | null => {
      if (node.id === targetId) return { w, h };
      if (node.children) {
          const totalFlex = node.children.reduce((a, b) => a + (b.flex || 1), 0);
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
    if (node.type === 'container') {
        if (node.openingType && node.openingType !== 'Fixed') {
             processHardware(node.openingType);
             const perimeter = (w + h) * 2;
             if (node.openingType.includes('Door')) stats.sashDoorMeters += perimeter;
             else stats.sashWindowMeters += perimeter;
        }
        if (node.children) {
            const totalFlex = node.children.reduce((a, b) => a + (b.flex || 1), 0);
            if (node.dir === 'row') stats.mullionMeters += (node.children.length - 1) * h;
            else stats.mullionMeters += (node.children.length - 1) * w;
            node.children.forEach(child => {
                const ratio = (child.flex || 1) / totalFlex;
                const childW = node.dir === 'row' ? w * ratio : w;
                const childH = node.dir === 'col' ? h * ratio : h;
                const childStats = calculateWindowStats(child, childW, childH);
                stats.sashWindowMeters += childStats.sashWindowMeters;
                stats.sashDoorMeters += childStats.sashDoorMeters;
                stats.mullionMeters += childStats.mullionMeters;
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
        if (node.openingType && node.openingType !== 'Fixed' && node.openingType !== 'Panel') {
            processHardware(node.openingType);
            const perimeter = (w + h) * 2;
            if (node.openingType.includes('Door')) stats.sashDoorMeters += perimeter;
            else stats.sashWindowMeters += perimeter;
        }
        if (node.openingType === 'Panel') stats.panelArea += w * h;
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
    const frameMeters = (config.width + config.height) * 2;
    const frameM = frameMeters / 1000;
    const mullionM = stats.mullionMeters / 1000;
    const sashWindowM = stats.sashWindowMeters / 1000;
    const sashDoorM = stats.sashDoorMeters / 1000;
    const beadM = stats.beadMeters / 1000;
    const glassA = stats.glassArea / 1000000; 
    const panelA = stats.panelArea / 1000000;
    const galoM = frameM + mullionM + sashWindowM + sashDoorM;
    const brand = brands.find(b => b.id === config.profileId);
    const glassType = glassList.find(g => g.id === config.glassId);
    const hwItems = pricingStore.getHardware();
    const panelType = hwItems.find(h => h.id === 'panel_upvc');
    const panelPricePerM2 = panelType?.pricePerSet || 1500000;
    const frameCompId = config.frameType === 'renovation' ? 'renovation' : 'frame';
    const framePrice = brand?.components.find(c => c.id === frameCompId)?.price || 0;
    const frameName = config.frameType === 'renovation' ? 'پروفیل فریم بازسازی' : 'پروفیل فریم';
    const mullionPrice = brand?.components.find(c => c.id === 'mullion')?.price || 0;
    const sashWindowPrice = brand?.components.find(c => c.id === 'sash_window')?.price || 0;
    const sashDoorPrice = brand?.components.find(c => c.id === 'sash_door')?.price || 0;
    const beadPrice = brand?.components.find(c => c.id === 'bead')?.price || 0;
    const galoPrice = brand?.components.find(c => c.id === 'galvanized')?.price || 150000;
    const glassPricePerM2 = glassType?.pricePerSqm || 0;
    const details: InvoiceDetail[] = [];
    let rowId = 1;
    const frameTotal = frameM * framePrice;
    if (frameM > 0) details.push({ rowId: rowId++, name: frameName, unit: 'متر طول', quantity: Number(frameM.toFixed(2)), unitPrice: framePrice, totalPrice: Math.round(frameTotal) });
    const sashWinTotal = sashWindowM * sashWindowPrice;
    if (sashWindowM > 0) details.push({ rowId: rowId++, name: 'پروفیل لنگه پنجره', unit: 'متر طول', quantity: Number(sashWindowM.toFixed(2)), unitPrice: sashWindowPrice, totalPrice: Math.round(sashWinTotal) });
    const sashDoorTotal = sashDoorM * sashDoorPrice;
    if (sashDoorM > 0) details.push({ rowId: rowId++, name: 'پروفیل لنگه درب', unit: 'متر طول', quantity: Number(sashDoorM.toFixed(2)), unitPrice: sashDoorPrice, totalPrice: Math.round(sashDoorTotal) });
    const mullionTotal = mullionM * mullionPrice;
    if (mullionM > 0) details.push({ rowId: rowId++, name: 'پروفیل مولیون (وادار)', unit: 'متر طول', quantity: Number(mullionM.toFixed(2)), unitPrice: mullionPrice, totalPrice: Math.round(mullionTotal) });
    const beadTotal = beadM * beadPrice;
    if (beadM > 0) details.push({ rowId: rowId++, name: 'پروفیل زهوار شیشه', unit: 'متر طول', quantity: Number(beadM.toFixed(2)), unitPrice: beadPrice, totalPrice: Math.round(beadTotal) });
    const galoTotal = galoM * galoPrice;
    if (galoM > 0) details.push({ rowId: rowId++, name: 'گالوانیزه تقویتی', unit: 'متر طول', quantity: Number(galoM.toFixed(2)), unitPrice: galoPrice, totalPrice: Math.round(galoTotal) });
    const glassTotal = glassA * glassPricePerM2;
    if (glassA > 0) details.push({ rowId: rowId++, name: glassType?.name || 'شیشه دوجداره', unit: 'متر مربع', quantity: Number(glassA.toFixed(2)), unitPrice: glassPricePerM2, totalPrice: Math.round(glassTotal) });
    const panelTotal = panelA * panelPricePerM2;
    if (panelA > 0) details.push({ rowId: rowId++, name: panelType?.name || 'پنل UPVC', unit: 'متر مربع', quantity: Number(panelA.toFixed(2)), unitPrice: panelPricePerM2, totalPrice: Math.round(panelTotal) });
    let hardwareTotalSum = 0;
    const hardwareMap = [
      { type: 'Turn', label: 'یراق تک حالته', count: stats.hardware.Turn },
      { type: 'TiltTurn', label: 'یراق دو حالته', count: stats.hardware.TiltTurn },
      { type: 'Sliding', label: 'یراق کشویی', count: stats.hardware.Sliding },
      { type: 'Door', label: 'یراق بازشو دربی (سوئیچی)', count: stats.hardware.Door },
    ];
    hardwareMap.forEach(hwEntry => {
      if (hwEntry.count > 0) {
        const match = hwItems.find(item => item.type === hwEntry.type);
        const price = match?.pricePerSet || 0;
        const total = hwEntry.count * price;
        hardwareTotalSum += total;
        details.push({ 
          rowId: rowId++, 
          name: hwEntry.label, 
          unit: 'دست', 
          quantity: hwEntry.count, 
          unitPrice: price, 
          totalPrice: Math.round(total) 
        });
      }
    });
    const totalProfileMeters = frameM + mullionM + sashWindowM + sashDoorM;
    const profileCost = frameTotal + sashWinTotal + sashDoorTotal + mullionTotal + galoTotal + beadTotal;
    const unitPrice = Math.round(profileCost + glassTotal + hardwareTotalSum + panelTotal);
    return {
        profileMeters: Number(totalProfileMeters.toFixed(2)),
        profilePrice: Math.round(profileCost),
        glassArea: Number(glassA.toFixed(2)),
        glassPrice: Math.round(glassTotal + panelTotal),
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
          calculations
      };
      const updatedItems = [...projectItems];
      if (editIndex !== undefined) {
          updatedItems[editIndex] = newItem;
          setProjectItems(updatedItems);
          const projectToSave = {
            ...projectDetails,
            items: updatedItems,
            totalPrice: updatedItems.reduce((acc, i) => acc + i.calculations.totalPrice, 0)
          };
          pricingStore.saveProject(projectToSave);
          setLastSavedId(newItem.id);
          navigate('/breakdown', { state: { projectDetails, items: updatedItems } });
      } else {
          updatedItems.push(newItem);
          setProjectItems(updatedItems);
          const projectToSave = {
            ...projectDetails,
            items: updatedItems,
            totalPrice: updatedItems.reduce((acc, i) => acc + i.calculations.totalPrice, 0)
          };
          pricingStore.saveProject(projectToSave);
          setLastSavedId(newItem.id);
          setConfig(prev => ({
              ...prev,
              id: Date.now().toString(),
              width: 1200,
              height: 1500,
              layout: createDefaultLayout()
          }));
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
          <button onClick={() => setActiveTab('openings')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'openings' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}>{t('opening')}</button>
          <button onClick={() => setActiveTab('splits')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'splits' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}>{t('splits')}</button>
          <button onClick={() => setActiveTab('tools')} className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'tools' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}>{t('tools')}</button>
        </div>
        <div className="p-3 h-20 overflow-x-auto overflow-y-hidden no-scrollbar bg-slate-800">
           {activeTab === 'openings' && (
              <div className="flex items-center gap-4 h-full">
                  <div className="flex items-center gap-2 pr-2 border-r border-slate-600/50 h-full">
                      <div className="flex items-center justify-center h-full w-6"><span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[9px] text-slate-500 font-bold whitespace-nowrap">پنجره</span></div>
                      <DraggableIcon type="opening" value="Fixed" label={t('fixed')} icon={<FixedIcon />} isActive={activeTool?.value === 'Fixed'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TurnLeft" label={t('turn_left')} icon={<TurnLeftIcon />} isActive={activeTool?.value === 'TurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TurnRight" label={t('turn_right')} icon={<TurnRightIcon />} isActive={activeTool?.value === 'TurnRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TiltTurnLeft" label={t('tilt_turn_left')} icon={<TiltTurnLeftIcon />} isActive={activeTool?.value === 'TiltTurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="TiltTurnRight" label={t('tilt_turn_right')} icon={<TiltTurnRightIcon />} isActive={activeTool?.value === 'TiltTurnRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="SlidingLeft" label={t('sliding_left')} icon={<SlidingIcon dir="left"/>} isActive={activeTool?.value === 'SlidingLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                      <DraggableIcon type="opening" value="SlidingRight" label={t('sliding_right')} icon={<SlidingIcon dir="right"/>} isActive={activeTool?.value === 'SlidingRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  </div>
                  <div className="flex items-center gap-2 pl-2 h-full">
                       <div className="flex items-center justify-center h-full w-6"><span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="text-[9px] text-slate-500 font-bold whitespace-nowrap">درب</span></div>
                       <DraggableIcon type="opening" value="DoorLeft" label={t('door') + ' راست'} icon={<DoorRightIcon />} isActive={activeTool?.value === 'DoorLeft'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                       <DraggableIcon type="opening" value="DoorRight" label={t('door') + ' چپ'} icon={<DoorLeftIcon />} isActive={activeTool?.value === 'DoorRight'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
                  </div>
                  <div className="flex items-center gap-2 pl-2 h-full border-l border-slate-600/50">
                       <DraggableIcon type="opening" value="Panel" label={t('panel')} icon={<LayoutTemplate size={24} />} isActive={activeTool?.value === 'Panel'} onClick={toggleTool} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
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
        <div className="flex-1 overflow-auto flex items-center justify-center p-1 cursor-grab active:cursor-grabbing">
             <div className="transition-transform duration-300 ease-out origin-center" style={{ transform: `scale(${zoomLevel})` }}>
                <div className="relative select-none" style={{ width: config.width / 4, height: config.height / 4 }}>
                  {config.layout && (
                    <WindowCanvas node={config.layout} selectedId={selectedNodeId} onSelect={handleCanvasNodeClick} onUpdateNode={handleUpdateNode} onDimensionEdit={handleDirectDimensionEdit} onChildResize={handleChildResize} width={config.width} height={config.height} isRoot={true} />
                  )}
                </div>
             </div>
        </div>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* FLOATING ACTION PANEL - REDESIGNED */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
          <div className="max-w-xl mx-auto flex flex-col items-center gap-3">
              
              {/* Expandable Settings Card */}
              <div className={`w-full bg-white/90 backdrop-blur-2xl border border-white/60 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-500 pointer-events-auto ${isPanelOpen ? 'max-h-[500px] p-6' : 'max-h-0 p-0 border-none opacity-0'}`}>
                  <div className="space-y-6">
                      {/* Dimensions Section */}
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

                      {/* Selectors Section */}
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

              {/* Persistent Action Bar */}
              <div className="w-full flex items-center gap-2 pointer-events-auto">
                  <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className={`h-14 w-14 flex items-center justify-center rounded-full transition-all shadow-xl border border-white/20 ${isPanelOpen ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  >
                     {isPanelOpen ? <ChevronDown size={24}/> : <SlidersHorizontal size={22}/>}
                  </button>
                  
                  <div className="flex-1 flex gap-2 h-14 bg-white/95 backdrop-blur-xl border border-white/40 p-1.5 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.1)]">
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
                            className="flex-[2] bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                          >
                             <Receipt size={16}/> صدور فاکتور ({toPersianDigits(projectItems.length)})
                          </button>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};
