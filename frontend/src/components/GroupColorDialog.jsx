// src/components/GroupColorDialog.jsx
import React, { useState, useEffect } from 'react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { ColorPickerComponent } from '@syncfusion/ej2-react-inputs';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { FiSave, FiX } from 'react-icons/fi';
import { useStateContext } from '../contexts/ContextProvider';

// Default colors for common groups
const DEFAULT_COLORS = {
  Base: '#CCCCCC', // Gray
  Media: '#4682B4', // Steel Blue
  Price: '#FF0000', // Red
  Promotion: '#FFA500', // Orange
  Seasonality: '#9370DB', // Medium Purple
  Weather: '#8B4513', // Brown
  Competition: '#000000', // Black
  Other: '#808080', // Dark Gray
};

const GroupColorDialog = ({ modelName, initialGroups = [], initialColors = {}, onClose, onSave }) => {
  const { currentColor } = useStateContext();
  const [groupColors, setGroupColors] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Initialize colors with defaults or existing values
  useEffect(() => {
    const colors = {};
    initialGroups.forEach((group) => {
      colors[group] = initialColors[group] || DEFAULT_COLORS[group] || `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    });
    setGroupColors(colors);
    if (initialGroups.length > 0) {
      setSelectedGroup(initialGroups[0]);
    }
  }, [initialGroups, initialColors]);

  // Handle color change
  const handleColorChange = (args) => {
    if (selectedGroup) {
      setGroupColors({
        ...groupColors,
        [selectedGroup]: args.currentValue.hex,
      });
    }
  };

  return (
    <DialogComponent
      width="70%" // Make it take 70% of the screen width
      height="70%" // Make it take 70% of the screen height
      maxWidth="1200px" // Maximum width to avoid it being too wide on large screens
      isModal
      showCloseIcon
      visible
      close={onClose}
      header="Set Group Colors"
      cssClass="group-color-dialog"
    >
      <div className="p-4 flex flex-col md:flex-row h-full">
        {/* Left side - Group list */}
        <div className="w-full md:w-1/3 pr-0 md:pr-4 mb-4 md:mb-0 md:border-r">
          <h3 className="text-lg font-semibold mb-4">Contribution Groups</h3>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {initialGroups.map((group) => (
              <div
                key={group}
                className={`flex justify-between items-center p-3 rounded cursor-pointer ${selectedGroup === group ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                onClick={() => setSelectedGroup(group)}
              >
                <span>{group}</span>
                <div
                  className="w-6 h-6 rounded-full border border-gray-300"
                  style={{ backgroundColor: groupColors[group] || '#ccc' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Color picker section */}
        <div className="w-full md:w-2/3 pl-0 md:pl-4">
          <h3 className="text-lg font-semibold mb-4">Select Color for "{selectedGroup}"</h3>

          {selectedGroup && (
            <>
              <div className="mb-4">
                <div className="w-full h-12 rounded-md border" style={{ backgroundColor: groupColors[selectedGroup] }} />
                <div className="text-center mt-2 text-sm">{groupColors[selectedGroup]}</div>
              </div>

              <div className="flex flex-col md:flex-row md:space-x-4">
                {/* Inline Palette section */}
                <div className="mb-6 w-full md:w-1/2">
                  <h4 className="text-md font-medium mb-2">Inline Palette</h4>
                  <ColorPickerComponent
                    id="inline-palette"
                    mode="Palette"
                    modeSwitcher={false}
                    inline
                    showButtons={false}
                    value={groupColors[selectedGroup]}
                    change={handleColorChange}
                  />
                </div>

                {/* Inline Picker section */}
                <div className="w-full md:w-1/2">
                  <h4 className="text-md font-medium mb-2">Inline Picker</h4>
                  <ColorPickerComponent
                    id="inline-picker"
                    mode="Picker"
                    modeSwitcher={false}
                    inline
                    showButtons={false}
                    value={groupColors[selectedGroup]}
                    change={handleColorChange}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end p-4 border-t">
        <ButtonComponent
          cssClass="e-normal mr-2"
          onClick={onClose}
        >
          <div className="flex items-center">
            <FiX className="mr-1" />
            Cancel
          </div>
        </ButtonComponent>

        <ButtonComponent
          cssClass="e-success"
          style={{ backgroundColor: currentColor, borderColor: currentColor }}
          onClick={() => onSave(groupColors)}
        >
          <div className="flex items-center">
            <FiSave className="mr-1" />
            Save Colors
          </div>
        </ButtonComponent>
      </div>
    </DialogComponent>
  );
};

export default GroupColorDialog;
