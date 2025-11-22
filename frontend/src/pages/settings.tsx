import { Card } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export function Settings() {

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">General Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Application Settings
              </label>
              <p className="text-sm mt-1 text-muted-foreground">
                General application settings will be available here.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4">About</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Task Management Application
            </p>
            <p className="text-xs text-muted-foreground">
              Manage your tasks with kanban boards and table views.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

