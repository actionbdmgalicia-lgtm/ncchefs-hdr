import { useState } from 'react'

export const Settings = () => {
  const [settings, setSettings] = useState({
    companyName: 'NCC Chefs',
    email: 'admin@ncchefs.com',
    theme: 'light',
    notifications: true,
    emailAlerts: true,
    dataBackup: true
  })

  return (
    <section className="p-8 md:p-12 max-w-7xl mx-auto font-body">
      <div className="mb-12">
        <h2 className="font-headline text-4xl font-bold text-on-surface mb-2">
          Configuración
        </h2>
        <p className="text-on-surface-variant text-lg">
          Administra las preferencias y ajustes del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Settings */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Información Empresarial</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Nombre de Empresa</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">Email de Contacto</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Preferencias</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded">
                <div>
                  <p className="font-bold text-on-surface">Notificaciones en la App</p>
                  <p className="text-sm text-on-surface-variant">Recibe alertas de eventos importantes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded">
                <div>
                  <p className="font-bold text-on-surface">Alertas por Email</p>
                  <p className="text-sm text-on-surface-variant">Recibe notificaciones en tu email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailAlerts}
                    onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/10">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-6">Gestión de Datos</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded">
                <div>
                  <p className="font-bold text-on-surface">Copia de Seguridad Automática</p>
                  <p className="text-sm text-on-surface-variant">Respalda automáticamente los datos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.dataBackup}
                    onChange={(e) => setSettings({ ...settings, dataBackup: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-high peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              <button className="w-full px-4 py-3 border border-outline-variant/30 text-on-surface font-bold text-sm uppercase tracking-widest rounded hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">download</span>
                Descargar Datos
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <div className="bg-surface-container-low p-6 rounded-lg">
            <h4 className="font-headline text-lg font-bold text-on-surface mb-4">Tu Cuenta</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Plan Actual</p>
                <p className="text-lg font-bold text-primary">Profesional</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Usuarios Activos</p>
                <p className="text-lg font-bold text-on-surface">4 de 10</p>
              </div>
              <button className="w-full px-4 py-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded hover:bg-primary-container transition-colors">
                Cambiar Plan
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="bg-surface-container-low p-6 rounded-lg">
            <h4 className="font-headline text-lg font-bold text-on-surface mb-4">Ayuda</h4>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <span className="material-symbols-outlined text-base">help</span>
                Centro de Ayuda
              </a>
              <a href="#" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <span className="material-symbols-outlined text-base">mail</span>
                Contactar Soporte
              </a>
              <a href="#" className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <span className="material-symbols-outlined text-base">description</span>
                Documentación
              </a>
            </div>
          </div>

          {/* Save Changes */}
          <button className="w-full px-6 py-3 bg-primary text-on-primary font-bold text-sm uppercase tracking-widest rounded hover:bg-primary-container transition-colors">
            Guardar Cambios
          </button>
        </div>
      </div>
    </section>
  )
}
