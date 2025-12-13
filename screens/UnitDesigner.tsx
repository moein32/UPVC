import React, { useState, useEffect } from 'react';
import { ArrowRight, Save, Trash2, SplitSquareHorizontal, SplitSquareVertical, PlusCircle, Maximize, ZoomIn, ZoomOut, RefreshCcw, Hand, MousePointer2, Receipt, Check, Edit3, Grid, XCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InputField, SelectField, PrimaryButton } from '../components/UIComponents';
import { WindowCanvas } from '../components/WindowCanvas';
import { WindowConfig, ProjectDetails, InvoiceItem, ProfileBrand, GlassType, HardwareItem, WindowNode, OpeningDirection, InvoiceDetail } from '../types';
import { pricingStore } from '../services/pricingStore';
import { toPersianDigits, formatPrice } from '../utils/formatting';

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
    if (!locationState.projectDetails) navigate('/project-setup');
  }, [locationState, navigate]);

  const [projectDetails] = useState<ProjectDetails>(locationState.projectDetails || {} as ProjectDetails);
  const [projectItems, setProjectItems] = useState<InvoiceItem[]>(locationState.items || []);
  const [editIndex, setEditIndex] = useState<number | undefined>(locationState.editIndex);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

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
    profileId: 'vistabest',
    glassId: 'double_4_4',
    hardwareId: 'h1',
    type: 'Custom',
    mullions: 0,
    layout: createDefaultLayout()
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('root');
  const [activeTab, setActiveTab] = useState<'openings' | 'splits' | 'tools'>('openings');
  const [zoomLevel, setZoomLevel] = useState(0.8); 
  
  // Mobile Interaction: Active Tool State
  const [activeTool, setActiveTool] = useState<{type: 'opening' | 'split', value: string, dir?: string, count?: number} | null>(null);
  
  // Selected Node Dimensions Helper
  const [selectedNodeDims, setSelectedNodeDims] = useState<{w: number, h: number, editableW: boolean, editableH: boolean} | null>(null);

  // Load Edit Data
  useEffect(() => {
    if (editIndex !== undefined && editIndex >= 0 && projectItems[editIndex]) {
      const item = projectItems[editIndex];
      setConfig({
        ...item.config,
        layout: item.config.layout || createDefaultLayout()
      });
      setSelectedNodeId('root');
    }
  }, [editIndex, projectItems]);

  // Set defaults
  useEffect(() => {
    if (editIndex === undefined && brands.length > 0 && !config.profileId) {
       setConfig(c => ({...c, profileId: brands[0].id, glassId: glassList[0]?.id || '' }));
    }
  }, [brands, glassList, editIndex]);

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
    setConfig(prev => ({
        ...prev,
        layout: updateNodeInTree(prev.layout!, id, (node) => ({ ...node, ...updates }))
    }));
  };

  const handleDelete = () => {
     if (!selectedNodeId || !config.layout) return;
     setConfig(prev => ({
       ...prev,
       layout: updateNodeInTree(prev.layout!, selectedNodeId, (node) => ({
         id: node.id, type: 'leaf', openingType: 'Fixed', flex: 1
       }))
     }));
  };

  // --- Mobile Friendly Interaction: Tap to Apply ---
  const handleCanvasNodeClick = (id: string) => {
      if (activeTool) {
          // Find target to ensure validity
          const targetNode = findNode(config.layout!, id);
          if (!targetNode) return;

          if (activeTool.type === 'opening') {
              // Openings can only be applied to leaves
               if (targetNode.type === 'leaf') {
                  handleUpdateNode(id, { openingType: activeTool.value as any });
               }
          } else if (activeTool.type === 'split') {
              // Splits applied to leaves convert them to containers
              if (targetNode.type === 'leaf') {
                  const count = activeTool.count || 2;
                  const newChildren = Array(count).fill(null).map((_, i) => ({
                      id: Date.now() + `_${i}_${Math.random()}`, 
                      type: 'leaf', 
                      openingType: targetNode.openingType || 'Fixed', // Inherit or reset
                      flex: 1 
                  })) as WindowNode[];

                  handleUpdateNode(id, { 
                      type: 'container', 
                      dir: activeTool.dir as 'row' | 'col', 
                      children: newChildren, 
                      openingType: undefined 
                  });
              } else if (activeTool.value === 'clear') {
                  // Clear split logic handled by 'delete' usually, but custom cleaner here
                  // Currently 'square' icon maps to delete/reset logic if implemented
              }
          }
          // Optionally keep tool active for multi-apply
      } else {
          // Standard Selection
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

  // --- Dimension Editing Logic ---
  useEffect(() => {
      if(selectedNodeId && config.layout) {
          const dims = calculateNodeDimensions(config.layout, config.width, config.height, selectedNodeId);
          if (dims) {
            const parent = findParent(config.layout, selectedNodeId);
            const editableW = parent ? parent.dir === 'row' : true; 
            const editableH = parent ? parent.dir === 'col' : true;
            
            setSelectedNodeDims({ ...dims, editableW, editableH });
          } else {
            setSelectedNodeDims(null);
          }
      } else {
          setSelectedNodeDims(null);
      }
  }, [selectedNodeId, config.layout, config.width, config.height]);

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

  const handleManualResize = (newVal: number, dim: 'w' | 'h') => {
      if (!selectedNodeId || !config.layout) return;
      
      const parent = findParent(config.layout, selectedNodeId);
      if (!parent || !parent.children) return; 

      if ((parent.dir === 'row' && dim === 'h') || (parent.dir === 'col' && dim === 'w')) return;

      const parentDims = calculateNodeDimensions(config.layout, config.width, config.height, parent.id);
      if(!parentDims) return;

      const totalSize = parent.dir === 'row' ? parentDims.w : parentDims.h;
      const totalFlex = parent.children.reduce((a, b) => a + (b.flex || 1), 0);
      
      const targetRatio = newVal / totalSize;
      
      if (targetRatio >= 0.95 || targetRatio <= 0.05) return; 

      const nodeIndex = parent.children.findIndex(c => c.id === selectedNodeId);
      const node = parent.children[nodeIndex];
      const otherFlex = totalFlex - (node.flex || 1);
      
      const newNodeFlex = (targetRatio * otherFlex) / (1 - targetRatio);

      handleUpdateNode(selectedNodeId, { flex: newNodeFlex });
  };
  
  // --- Drag Handling (Desktop Fallback) ---
  const handleDragStart = (e: React.DragEvent, type: 'opening' | 'split', value: string, dir?: string, count?: number) => {
      e.dataTransfer.setData('actionType', type);
      e.dataTransfer.setData('value', value);
      if (dir) e.dataTransfer.setData('dir', dir);
      if (count) e.dataTransfer.setData('count', count.toString());
      e.dataTransfer.effectAllowed = 'copy';
      // Also set active tool on drag for consistency? No, distinct actions.
      setActiveTool({ type, value, dir, count });
  };

  // --- Comprehensive Price Calculation ---
  const calculateWindowStats = (node: WindowNode, w: number, h: number) => {
    let stats = {
        sashWindowMeters: 0,
        sashDoorMeters: 0,
        mullionMeters: 0,
        glassArea: 0,
        sashCount: 0
    };

    if (node.type === 'container' && node.children) {
        const totalFlex = node.children.reduce((a, b) => a + (b.flex || 1), 0);
        
        if (node.dir === 'row') {
            stats.mullionMeters += (node.children.length - 1) * h;
        } else {
            stats.mullionMeters += (node.children.length - 1) * w;
        }

        node.children.forEach(child => {
            const ratio = (child.flex || 1) / totalFlex;
            const childW = node.dir === 'row' ? w * ratio : w;
            const childH = node.dir === 'col' ? h * ratio : h;
            
            const childStats = calculateWindowStats(child, childW, childH);
            stats.sashWindowMeters += childStats.sashWindowMeters;
            stats.sashDoorMeters += childStats.sashDoorMeters;
            stats.mullionMeters += childStats.mullionMeters;
            stats.glassArea += childStats.glassArea;
            stats.sashCount += childStats.sashCount;
        });
    } else {
        if (node.openingType && node.openingType !== 'Fixed') {
            stats.sashCount += 1;
            const perimeter = (w + h) * 2;
            
            if (node.openingType.includes('Door')) {
                stats.sashDoorMeters += perimeter;
            } else {
                stats.sashWindowMeters += perimeter;
            }
        }
        stats.glassArea += w * h;
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
    const glassA = stats.glassArea / 1000000; 

    const galoM = frameM + mullionM + sashWindowM + sashDoorM;

    const brand = brands.find(b => b.id === config.profileId);
    const glassType = glassList.find(g => g.id === config.glassId);
    const hwItem = hardwareList.find(h => h.id === 'h1');

    const framePrice = brand?.components.find(c => c.id === 'frame')?.price || 0;
    const mullionPrice = brand?.components.find(c => c.id === 'mullion')?.price || 0;
    const sashWindowPrice = brand?.components.find(c => c.id === 'sash_window')?.price || 0;
    const sashDoorPrice = brand?.components.find(c => c.id === 'sash_door')?.price || 0;
    const galoPrice = brand?.components.find(c => c.id === 'galvanized')?.price || 150000;
    
    const glassPricePerM2 = glassType?.pricePerSqm || 0;
    const hardwarePricePerSet = hwItem?.pricePerSet || 450000;

    const details: InvoiceDetail[] = [];
    let rowId = 1;

    const frameTotal = frameM * framePrice;
    if (frameM > 0) details.push({ rowId: rowId++, name: 'پروفیل فریم', unit: 'متر طول', quantity: Number(frameM.toFixed(2)), unitPrice: framePrice, totalPrice: Math.round(frameTotal) });

    const sashWinTotal = sashWindowM * sashWindowPrice;
    if (sashWindowM > 0) details.push({ rowId: rowId++, name: 'پروفیل لنگه پنجره', unit: 'متر طول', quantity: Number(sashWindowM.toFixed(2)), unitPrice: sashWindowPrice, totalPrice: Math.round(sashWinTotal) });

    const sashDoorTotal = sashDoorM * sashDoorPrice;
    if (sashDoorM > 0) details.push({ rowId: rowId++, name: 'پروفیل لنگه درب', unit: 'متر طول', quantity: Number(sashDoorM.toFixed(2)), unitPrice: sashDoorPrice, totalPrice: Math.round(sashDoorTotal) });

    const mullionTotal = mullionM * mullionPrice;
    if (mullionM > 0) details.push({ rowId: rowId++, name: 'پروفیل مولیون', unit: 'متر طول', quantity: Number(mullionM.toFixed(2)), unitPrice: mullionPrice, totalPrice: Math.round(mullionTotal) });

    const galoTotal = galoM * galoPrice;
    if (galoM > 0) details.push({ rowId: rowId++, name: 'گالوانیزه تقویتی', unit: 'متر طول', quantity: Number(galoM.toFixed(2)), unitPrice: galoPrice, totalPrice: Math.round(galoTotal) });

    const glassTotal = glassA * glassPricePerM2;
    if (glassA > 0) details.push({ rowId: rowId++, name: glassType?.name || 'شیشه', unit: 'متر مربع', quantity: Number(glassA.toFixed(2)), unitPrice: glassPricePerM2, totalPrice: Math.round(glassTotal) });

    const hardwareTotal = stats.sashCount * hardwarePricePerSet;
    if (stats.sashCount > 0) details.push({ rowId: rowId++, name: 'یراق آلات', unit: 'دست', quantity: stats.sashCount, unitPrice: hardwarePricePerSet, totalPrice: Math.round(hardwareTotal) });

    const totalProfileMeters = frameM + mullionM + sashWindowM + sashDoorM;
    const profileCost = frameTotal + sashWinTotal + sashDoorTotal + mullionTotal + galoTotal;
    const unitPrice = Math.round(profileCost + glassTotal + hardwareTotal);

    return {
        profileMeters: Number(totalProfileMeters.toFixed(2)),
        profilePrice: Math.round(profileCost),
        glassArea: Number(glassA.toFixed(2)),
        glassPrice: Math.round(glassTotal),
        sashCount: stats.sashCount,
        hardwarePrice: Math.round(hardwareTotal),
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
      } else {
          updatedItems.push(newItem);
      }
      setProjectItems(updatedItems);

      const projectToSave = {
        ...projectDetails,
        items: updatedItems,
        totalPrice: updatedItems.reduce((acc, i) => acc + i.calculations.totalPrice, 0)
      };
      pricingStore.saveProject(projectToSave);

      setLastSavedId(newItem.id);
      
      if (editIndex !== undefined) {
         navigate('/breakdown', { state: { projectDetails, items: updatedItems } });
      } else {
         setConfig(prev => ({ ...prev, id: Date.now().toString() }));
      }
  };

  const isRootSelected = selectedNodeId === 'root' || selectedNodeId === null;

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center z-30 shadow-sm border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
          <ArrowRight size={20} className={i18n.language === 'en' ? 'rotate-180' : ''} />
        </button>
        <div className="text-center">
             <h1 className="font-bold text-slate-800 text-lg">{t('unit_design')}</h1>
             <p className="text-[10px] text-slate-500">{projectDetails.customerName}</p>
        </div>
        <div className="flex gap-2">
             <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center">
                {toPersianDigits(projectItems.length)} {t('item')}
             </div>
        </div>
      </div>

      {/* Professional Tabbed Toolbar */}
      <div className="bg-slate-800 text-white z-20 shadow-md flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button 
            onClick={() => setActiveTab('openings')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'openings' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t('opening')}
          </button>
          <button 
            onClick={() => setActiveTab('splits')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'splits' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
             {t('splits')}
          </button>
          <button 
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'tools' ? 'bg-slate-700 text-white border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
             {t('tools')}
          </button>
        </div>

        {/* Toolbar Content Area */}
        <div className="p-3 h-20 overflow-x-auto overflow-y-hidden no-scrollbar bg-slate-800">
           {activeTab === 'openings' && (
              <div className="flex items-center gap-4 h-full">
                  <DraggableIcon 
                      type="opening" value="Fixed" label={t('fixed')} icon={<FixedIcon />} 
                      isActive={activeTool?.value === 'Fixed'}
                      onClick={toggleTool} onDragStart={handleDragStart} 
                  />
                  <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                  <DraggableIcon type="opening" value="TurnRight" label={t('turn_right')} icon={<TurnRightIcon />} isActive={activeTool?.value === 'TurnRight'} onClick={toggleTool} onDragStart={handleDragStart} />
                  <DraggableIcon type="opening" value="TurnLeft" label={t('turn_left')} icon={<TurnLeftIcon />} isActive={activeTool?.value === 'TurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} />
                  <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                  <DraggableIcon type="opening" value="TiltTurnRight" label={t('tilt_turn_right')} icon={<TiltTurnRightIcon />} isActive={activeTool?.value === 'TiltTurnRight'} onClick={toggleTool} onDragStart={handleDragStart} />
                  <DraggableIcon type="opening" value="TiltTurnLeft" label={t('tilt_turn_left')} icon={<TiltTurnLeftIcon />} isActive={activeTool?.value === 'TiltTurnLeft'} onClick={toggleTool} onDragStart={handleDragStart} />
                  <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                  <DraggableIcon type="opening" value="SlidingRight" label={t('sliding_right')} icon={<SlidingIcon dir="right"/>} isActive={activeTool?.value === 'SlidingRight'} onClick={toggleTool} onDragStart={handleDragStart} />
                  <DraggableIcon type="opening" value="SlidingLeft" label={t('sliding_left')} icon={<SlidingIcon dir="left"/>} isActive={activeTool?.value === 'SlidingLeft'} onClick={toggleTool} onDragStart={handleDragStart} />
                  <DraggableIcon type="opening" value="DoorRight" label={t('door')} icon={<DoorIcon />} isActive={activeTool?.value === 'DoorRight'} onClick={toggleTool} onDragStart={handleDragStart} />
              </div>
           )}

           {activeTab === 'splits' && (
              <div className="flex items-center gap-4 h-full">
                  <DraggableIcon type="split" dir="row" count={2} label={t('split_v_2')} icon={<SplitVerticalIcon count={2} />} isActive={activeTool?.dir === 'row' && activeTool.count === 2} onClick={toggleTool} onDragStart={handleDragStart} />
                  <DraggableIcon type="split" dir="col" count={2} label={t('split_h_2')} icon={<SplitHorizontalIcon count={2} />} isActive={activeTool?.dir === 'col' && activeTool.count === 2} onClick={toggleTool} onDragStart={handleDragStart} />
                  <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                  <DraggableIcon type="split" dir="row" count={3} label={t('split_v_3')} icon={<SplitVerticalIcon count={3} />} isActive={activeTool?.dir === 'row' && activeTool.count === 3} onClick={toggleTool} onDragStart={handleDragStart} />
                  <DraggableIcon type="split" dir="col" count={3} label={t('split_h_3')} icon={<SplitHorizontalIcon count={3} />} isActive={activeTool?.dir === 'col' && activeTool.count === 3} onClick={toggleTool} onDragStart={handleDragStart} />
                  <div className="w-px h-8 bg-slate-600 opacity-50"></div>
                  <DraggableIcon type="split" dir="row" count={1} value="clear" label={t('clear_split')} icon={<SquareIcon />} isActive={activeTool?.value === 'clear'} onClick={toggleTool} onDragStart={handleDragStart} />
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

      {/* Canvas Area with Zoom */}
      <div className="flex-1 relative bg-slate-200 overflow-hidden flex flex-col">
        {/* Active Tool Indicator for Mobile */}
        {activeTool && (
           <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
                <div className="bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
                    <span>{t('active_tool_hint')}</span>
                    <button onClick={() => setActiveTool(null)} className="ml-2 bg-white/20 rounded-full p-0.5"><XCircle size={16}/></button>
                </div>
           </div>
        )}

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-white rounded-lg shadow-md p-1">
           <button onClick={() => setZoomLevel(z => Math.min(z + 0.1, 2))} className="p-2 text-slate-600 hover:bg-slate-100 rounded"><ZoomIn size={20}/></button>
           <button onClick={() => setZoomLevel(1)} className="p-2 text-slate-600 hover:bg-slate-100 rounded"><RefreshCcw size={16}/></button>
           <button onClick={() => setZoomLevel(z => Math.max(z - 0.1, 0.4))} className="p-2 text-slate-600 hover:bg-slate-100 rounded"><ZoomOut size={20}/></button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 cursor-grab active:cursor-grabbing">
             <div 
                className="transition-transform duration-200 ease-out origin-center"
                style={{ transform: `scale(${zoomLevel})` }}
             >
                <div 
                  className="relative bg-white shadow-2xl border-[12px] border-white select-none rounded-sm"
                  style={{ 
                    width: Math.min(config.width / 4, window.innerWidth - 60), 
                    height: Math.min(config.height / 4, window.innerHeight - 300),
                    minWidth: '300px',
                    minHeight: '300px'
                  }}
                >
                  <div className="absolute inset-[-12px] border border-slate-300 pointer-events-none rounded-sm shadow-sm"></div>
                  {config.layout && (
                    <WindowCanvas 
                        node={config.layout} 
                        selectedId={selectedNodeId} 
                        // IMPORTANT: Click now applies tool or selects
                        onSelect={handleCanvasNodeClick}
                        onUpdateNode={handleUpdateNode}
                        width={config.width}
                        height={config.height}
                    />
                  )}
                </div>
             </div>
        </div>
        
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
      </div>

      {/* Bottom Properties Panel */}
      <div className="bg-white rounded-t-2xl shadow-[0_-5px_30px_rgba(0,0,0,0.1)] z-30 p-5 pb-8">
         {/* Dynamic Dimensions Row */}
         <div className={`flex gap-4 mb-4 items-center p-3 rounded-xl border transition-colors ${!isRootSelected ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
             <span className={`text-xs font-bold whitespace-nowrap ${!isRootSelected ? 'text-orange-600' : 'text-slate-500'}`}>
                {isRootSelected ? t('global_dims') : t('section_dims')}
             </span>
             
             {isRootSelected ? (
                // Global Dims (Root)
                <div className="flex gap-2 flex-1">
                     <div className="relative flex-1">
                         <input 
                             type="number"
                             value={config.width}
                             onChange={(e) => setConfig({...config, width: Number(e.target.value)})}
                             className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-300 text-center font-bold text-sm"
                         />
                         <span className="absolute left-2 top-2 text-[10px] text-slate-400">mm</span>
                         <span className="absolute right-2 top-2 text-[10px] text-slate-400">{t('width')}</span>
                     </div>
                     <span className="self-center text-slate-400">×</span>
                     <div className="relative flex-1">
                         <input 
                             type="number"
                             value={config.height}
                             onChange={(e) => setConfig({...config, height: Number(e.target.value)})}
                             className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-300 text-center font-bold text-sm"
                         />
                         <span className="absolute left-2 top-2 text-[10px] text-slate-400">mm</span>
                         <span className="absolute right-2 top-2 text-[10px] text-slate-400">{t('height')}</span>
                     </div>
                 </div>
             ) : (
                // Selected Section Dims
                 <div className="flex gap-2 flex-1">
                     <div className="relative flex-1">
                         <input 
                             type="number"
                             disabled={!selectedNodeDims?.editableW}
                             value={selectedNodeDims ? Math.round(selectedNodeDims.w) : ''}
                             onChange={(e) => handleManualResize(Number(e.target.value), 'w')}
                             className={`w-full pl-8 pr-2 py-2 rounded-lg border text-center font-bold text-sm 
                                ${!selectedNodeDims?.editableW ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-orange-300 text-orange-900'}
                             `}
                         />
                         <span className="absolute left-2 top-2 text-[10px] text-slate-400">mm</span>
                         <span className="absolute right-2 top-2 text-[10px] text-slate-400">{t('width')}</span>
                     </div>
                     <span className="self-center text-slate-400">×</span>
                     <div className="relative flex-1">
                         <input 
                             type="number"
                             disabled={!selectedNodeDims?.editableH}
                             value={selectedNodeDims ? Math.round(selectedNodeDims.h) : ''}
                             onChange={(e) => handleManualResize(Number(e.target.value), 'h')}
                             className={`w-full pl-8 pr-2 py-2 rounded-lg border text-center font-bold text-sm 
                                ${!selectedNodeDims?.editableH ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-orange-300 text-orange-900'}
                             `}
                         />
                         <span className="absolute left-2 top-2 text-[10px] text-slate-400">mm</span>
                         <span className="absolute right-2 top-2 text-[10px] text-slate-400">{t('height')}</span>
                     </div>
                     <button onClick={() => setSelectedNodeId('root')} className="p-2 bg-slate-200 rounded-lg text-slate-600 hover:bg-slate-300" title="بازگشت به ابعاد کل">
                        <Grid size={16} />
                     </button>
                 </div>
             )}
         </div>

         <div className="flex gap-3">
             <PrimaryButton 
                onClick={handleAddToList}
                variant={editIndex !== undefined ? "primary" : "secondary"}
                className={`flex-1 ${lastSavedId ? '!bg-green-50 !text-green-600 !border-green-200' : ''}`}
                icon={lastSavedId ? Check : PlusCircle}
            >
                {editIndex !== undefined ? t('save_changes') : (lastSavedId ? t('added') : t('add_to_list'))}
             </PrimaryButton>

             {(projectItems.length > 0 || lastSavedId) && (
                 <PrimaryButton 
                    onClick={() => navigate('/breakdown', { state: { projectDetails, items: projectItems } })} 
                    className="flex-[1.5] bg-gradient-to-r from-blue-700 to-blue-900"
                    icon={Receipt}
                >
                   {t('calculate_invoice')} ({toPersianDigits(projectItems.length)})
                </PrimaryButton>
             )}
         </div>
      </div>
    </div>
  );
};

// --- Icons & Helpers ---
const ToolBtn = ({ icon: Icon, label, onClick, color = 'text-white', isActive }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center p-2 rounded-lg hover:bg-slate-700 transition-all ${color} min-w-[60px] ${isActive ? 'bg-slate-700 ring-1 ring-slate-400' : ''}`}>
    <Icon size={24} strokeWidth={1.5} />
    <span className="text-[9px] mt-1 whitespace-nowrap">{label}</span>
  </button>
);

const DraggableIcon = ({ type, value, dir, count, label, icon, onDragStart, isActive, onClick }: any) => (
    <div 
        draggable 
        onDragStart={(e) => onDragStart(e, type, value, dir, count)}
        onClick={() => onClick({ type, value, dir, count })}
        className={`flex flex-col items-center cursor-pointer hover:bg-slate-700 p-2 rounded-lg min-w-[70px] transition-all duration-200
            ${isActive ? 'bg-orange-600 shadow-lg scale-105 ring-2 ring-orange-300' : ''}
        `}
    >
        <div className="w-8 h-8 mb-1 text-white flex items-center justify-center">{icon}</div>
        <span className="text-[9px] text-center text-slate-300 whitespace-nowrap">{label}</span>
    </div>
);

// --- Custom SVGs ---
const FixedIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 21L21 3" className="opacity-30" />
    </svg>
);

const TurnRightIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M21 12L3 3V21L21 12Z" fill="white" fillOpacity="0.2" />
        <path d="M16 12L8 4V20L16 12Z" fill="none" stroke="white" strokeWidth="1.5" />
    </svg>
);

const TurnLeftIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 12L21 3V21L3 12Z" fill="white" fillOpacity="0.2" />
        <path d="M8 12L16 4V20L8 12Z" fill="none" stroke="white" strokeWidth="1.5" />
    </svg>
);

const TiltTurnRightIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M16 12L8 4V20L16 12Z" fill="none" stroke="white" strokeWidth="1.5" />
        <path d="M12 20L4 4H20L12 20Z" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
    </svg>
);

const TiltTurnLeftIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12L16 4V20L8 12Z" fill="none" stroke="white" strokeWidth="1.5" />
        <path d="M12 20L4 4H20L12 20Z" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
    </svg>
);

const SlidingIcon = ({ dir }: { dir: 'left' | 'right' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12H16M16 12L13 9M16 12L13 15" transform={dir === 'left' ? 'rotate(180 12 12)' : ''} />
    </svg>
);

const DoorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="5" y="3" width="14" height="18" rx="1" />
        <circle cx="16" cy="12" r="1.5" fill="currentColor" />
    </svg>
);

const SplitVerticalIcon = ({ count }: { count: number }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full bg-slate-700/50 rounded">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        {count === 2 && <line x1="12" y1="2" x2="12" y2="22" />}
        {count === 3 && (
            <>
                <line x1="8" y1="2" x2="8" y2="22" />
                <line x1="16" y1="2" x2="16" y2="22" />
            </>
        )}
    </svg>
);

const SplitHorizontalIcon = ({ count }: { count: number }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full bg-slate-700/50 rounded">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        {count === 2 && <line x1="2" y1="12" x2="22" y2="12" />}
        {count === 3 && (
            <>
                <line x1="2" y1="8" x2="22" y2="8" />
                <line x1="2" y1="16" x2="22" y2="16" />
            </>
        )}
    </svg>
);

const SquareIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
        <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
);