import { useAuth } from '../../context/AuthContext'

export const TeamManagement = () => {
  const { currentUser } = useAuth()

  const teamMembers = [
    {
      id: 1,
      name: 'Elena Smith',
      email: 'elena.s@ncchefs.com',
      role: 'Administrador',
      status: 'Activo',
      lastActivity: 'Hace 12 minutos',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwHF7eA4M2btUfJGvmgglSjrjR7887FmrtyavKQU2WbBpo4VmcufjGo4-Z8f8jn63l6swObEmwXFCwEcgVaRcemrTmrgqrZhA6oJTtWoD94HMFiNjUi8J247WV_mSRf2ixDCWSXkU0xhc5k_IS0ZVzMX3vZDmhQkt6FZqsjmLHkij4CtLmNeSulyy6NBbtvPvInVbkrVm83Bul3jopZ-nlBX8qygKvORJmE-iXLAZ4OlyK6YcPtvHhS5lMzYSFvYFT_IZBRUU9GUnz'
    },
    {
      id: 2,
      name: 'Marco Jiménez',
      email: 'm.jimenez@ncchefs.com',
      role: 'Organizador',
      status: 'Activo',
      lastActivity: 'Ayer, 18:45',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiUG37TKXj26a4Sb5wifV8HPJhKJT0TqMCS4Z19OKbP7qqafSajmZJnQ6RHqH2pQIuEqEZTeA-PzO_8KdCrBwD-gekTdwvdx09J5VL0lSht1KyJdN1a1lyV9z8KHgk6Ty1ipAXsJgzym6C5pDU4RWwdx8vZiJPwkiauCTo37SWJKqUumc7FIcfEArnd8Rz1miuUHzPhH3je0OkGsqoxjfEfAq4yTFYGF5YqzSkkLM8rHn0aRQDFumYcziSRPlDTz2cVxt5f4F-hrUY'
    },
    {
      id: 3,
      name: 'Carla Rossi',
      email: 'c.rossi@ncchefs.com',
      role: 'Cocina',
      status: 'Fuera de línea',
      lastActivity: 'Hace 3 días',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzquHz95XfOE_zrp2pg9xINOAtk4500GD2xLb2CQEfn932soRhqktr1AkR4GjY7Rk3AnZ0vsomPGZSEzWg5nLUWb7Op8X1qTVX2mS86gc33_UmFMsJxEUhye3ZDqRmXBPHFCoA8H6Yn2J4mdnblfMEc32Mk5PBE_tvwunseFd8EgpQiluxDgEpoFFbYNgEP8_crJ92TUtCOWw7QgHt4VAP9VE8CMpNPkL120DQmhSabH7SMX6ySBcOYhcOzffu_HMWn8D1DVkCwNku'
    },
    {
      id: 4,
      name: 'Tomás Valdés',
      email: 't.valdes@ncchefs.com',
      role: 'Logística',
      status: 'Activo',
      lastActivity: 'Hace 2 horas',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMzZjuQU_m46Ylrz1maIA_z2vMC8LYtqEVVn2MtrBVSzkfYKNvKTiv2I2N5TPKtk_ETW5WWfAD8YjMojqZjiM7r1yO_T1oHqlg2IKPE-PAk6eXJvkhWWZ-Yy5ckHPrCDt9IQL3gNhyJHFCoA8H6Yn2J4mdnblfMEc32Mk5PBE_tvwunseFd8EgpQiluxDgEpoFFbYNgEP8_crJ92TUtCOWw7QgHt4VAP9VE8CMpNPkL120DQmhSabH7SMX6ySBcOYhcOzffu_HMWn8D1DVkCwNku'
    }
  ]

  const roleDescriptions = [
    {
      title: 'Administrador',
      description: 'Control total del sistema, facturación y gestión global de eventos.'
    },
    {
      title: 'Organizador',
      description: 'Gestión de menús, cronogramas y coordinación directa con clientes.'
    },
    {
      title: 'Cocina',
      description: 'Acceso a fichas técnicas, alergias y control de producción gastronómica.'
    },
    {
      title: 'Logística',
      description: 'Gestión de inventarios, transporte y montaje en locaciones externas.'
    }
  ]

  return (
    <section className="p-8 md:p-12 max-w-7xl mx-auto font-body">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-headline text-4xl font-bold text-on-surface mb-2">
            Gestión de Equipo
          </h2>
          <p className="text-on-surface-variant text-lg">
            Coordina el talento detrás de cada celebración. Administra roles, accesos y permisos del equipo de catering de lujo.
          </p>
        </div>
        <button className="px-8 py-3 bg-white border border-outline-variant/30 text-primary font-bold uppercase text-xs tracking-widest rounded-md shadow-sm hover:bg-surface-container-low transition-colors flex items-center gap-3 w-fit">
          <span className="material-symbols-outlined">person_add</span>
          Invitar Miembro
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        <div className="lg:col-span-8 bg-surface-container-low p-8 rounded-xl flex flex-col justify-between min-h-[240px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-primary/70">Estado de Operaciones</span>
            <span className="material-symbols-outlined text-primary/40">restaurant</span>
          </div>
          <div>
            <h3 className="font-headline text-3xl text-on-surface mb-2">Personal Activo</h3>
            <p className="text-on-surface-variant text-sm max-w-md">
              Actualmente hay 14 miembros asignados a los eventos de esta semana.
            </p>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex -space-x-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full ring-2 ring-surface bg-surface-container-highest overflow-hidden">
                  <img alt="Team member" className="w-full h-full object-cover" src={teamMembers[i - 1]?.avatar} />
                </div>
              ))}
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest ring-2 ring-surface text-xs font-bold text-on-surface-variant">
                +11
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 grid grid-cols-1 gap-6">
          <div className="bg-primary text-on-primary p-6 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Siguiente Evento</span>
            <div className="mt-4">
              <p className="text-xl font-headline">Gala de Verano</p>
              <p className="text-xs opacity-80 mt-1">24 de Junio • 20:00</p>
            </div>
          </div>
          <div className="bg-tertiary-fixed p-6 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-tertiary-fixed-variant">Invitaciones Pendientes</span>
            <div className="flex items-center justify-between mt-4">
              <p className="text-3xl font-bold text-on-tertiary-fixed">03</p>
              <span className="material-symbols-outlined text-on-tertiary-fixed-variant">pending_actions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-outline-variant/5 bg-surface-container-low/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-headline text-xl font-semibold">Directorio de Miembros</h2>
          <div className="flex items-center gap-3">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">sort_by_alpha</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/30 text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
                <th className="px-8 py-4">Miembro</th>
                <th className="px-8 py-4">Rol de Catering</th>
                <th className="px-8 py-4">Estado</th>
                <th className="px-8 py-4">Última Actividad</th>
                <th className="px-8 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-surface-container-low/40 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/20">
                        <img alt={member.name} className="w-full h-full object-cover" src={member.avatar} />
                      </div>
                      <div>
                        <p className="font-body font-bold text-on-surface">{member.name}</p>
                        <p className="text-xs text-on-surface-variant font-light">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                      member.role === 'Administrador' ? 'bg-primary-fixed-dim/20 text-on-primary-fixed-variant' :
                      member.role === 'Cocina' ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant' :
                      'bg-surface-container-highest text-on-surface-variant'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        member.status === 'Activo' ? 'bg-primary shadow-[0_0_8px_rgba(119,90,25,0.5)]' : 'bg-stone-300'
                      }`}></span>
                      <span className="text-xs font-medium">{member.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-on-surface-variant">{member.lastActivity}</td>
                  <td className="px-8 py-6 text-right">
                    <button className="text-on-surface-variant hover:text-primary p-2 group-hover:bg-white rounded-full transition-all">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-surface-container-low/20 border-t border-outline-variant/5 flex justify-between items-center">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Mostrando 4 de 18 miembros</p>
          <div className="flex gap-2">
            <button className="h-8 w-8 flex items-center justify-center rounded border border-outline-variant/20 hover:bg-white transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="h-8 w-8 flex items-center justify-center rounded border border-outline-variant/20 bg-white shadow-sm text-primary font-bold text-xs">1</button>
            <button className="h-8 w-8 flex items-center justify-center rounded border border-outline-variant/20 hover:bg-white transition-colors text-xs">2</button>
            <button className="h-8 w-8 flex items-center justify-center rounded border border-outline-variant/20 hover:bg-white transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permission Legend */}
      <footer className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-8 py-8 border-t border-outline-variant/10">
        {roleDescriptions.map((role) => (
          <div key={role.title}>
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-primary mb-3">{role.title}</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">{role.description}</p>
          </div>
        ))}
      </footer>
    </section>
  )
}
