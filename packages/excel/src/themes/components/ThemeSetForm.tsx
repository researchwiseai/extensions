import React, { useState } from 'react';
import {
  Stack,
  TextField,
  DefaultButton,
  PrimaryButton,
  IconButton,
} from '@fluentui/react';
import { Theme, ThemeSet } from './ThemeSetList';

interface ThemeSetFormProps {
  initialData?: ThemeSet;
  onSave: (themeSet: ThemeSet) => void;
  onCancel: () => void;
}

export const ThemeSetForm: React.FC<ThemeSetFormProps> = ({ initialData, onSave, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [themes, setThemes] = useState<Theme[]>(
    initialData?.themes || [{ label: '', example1: '', example2: '' }]
  );

  const handleNameChange = (_: any, newValue?: string) => {
    setName(newValue || '');
  };

  const handleThemeChange = (index: number, field: keyof Theme) => (_: any, newValue?: string) => {
    const updated = [...themes];
    updated[index] = { ...updated[index], [field]: newValue || '' };
    setThemes(updated);
  };

  const addTheme = () => {
    setThemes([...themes, { label: '', example1: '', example2: '' }]);
  };

  const removeTheme = (index: number) => {
    const updated = [...themes];
    updated.splice(index, 1);
    setThemes(updated);
  };

  const handleSubmit = () => {
    const id = initialData?.id || Date.now().toString();
    onSave({ id, name, themes });
  };

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: 16 } }}>
      <TextField
        label="Theme Set Name"
        value={name}
        onChange={handleNameChange}
        required
      />
      <Stack tokens={{ childrenGap: 8 }}>
        {themes.map((theme, index) => (
          <Stack
            horizontal
            tokens={{ childrenGap: 8 }}
            verticalAlign="end"
            key={index}
          >
            <TextField
              label="Label"
              value={theme.label}
              onChange={handleThemeChange(index, 'label')}
            />
            <TextField
              label="Example 1"
              value={theme.example1}
              onChange={handleThemeChange(index, 'example1')}
            />
            <TextField
              label="Example 2"
              value={theme.example2}
              onChange={handleThemeChange(index, 'example2')}
            />
            <IconButton
              iconProps={{ iconName: 'Delete' }}
              ariaLabel="Remove theme"
              onClick={() => removeTheme(index)}
            />
          </Stack>
        ))}
      </Stack>
      <DefaultButton text="Add Theme" onClick={addTheme} />
      <Stack horizontal tokens={{ childrenGap: 8 }}>
        <PrimaryButton
          text="Save"
          onClick={handleSubmit}
          disabled={!name.trim()}
        />
        <DefaultButton text="Cancel" onClick={onCancel} />
      </Stack>
    </Stack>
  );
};