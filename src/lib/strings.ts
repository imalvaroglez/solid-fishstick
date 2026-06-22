// All user-facing text, centralized in Spanish (Mexico).
// ponytail: no i18n framework yet — a plain constants object. Swap for a
// message catalog later without touching components.

export const STRINGS = {
  appName: "Primeras Ventas",

  nav: {
    home: "Inicio",
    catalog: "Catálogo",
    orders: "Pedidos",
    customers: "Clientes",
  },

  home: {
    greeting: "Hola 👋",
    subtitle: "Esto es lo que sigue hoy.",
    activeOrders: (n: number) => `${n} ${n === 1 ? "pedido activo" : "pedidos activos"}`,
    pendingPayment: "Falta cobrar",
    expectedProfit: "Vas a ganar",
    newOrder: "Nuevo pedido",
    emptyTitle: "Aún no tienes pedidos activos.",
    emptyBody: "Crea tu primer pedido cuando alguien te pida un producto.",
    completedSection: "Terminados",
  },

  groups: {
    "Needs confirmation": "Falta confirmar",
    "Buy product": "Toca comprar",
    "Waiting arrival": "Esperando que llegue",
    "Ready to deliver": "Listo para entregar",
    "Waiting payment": "Falta cobrar",
  } as const,

  order: {
    sale: "Venta",
    profit: "Ganancia",
    pending: "Falta cobrar",
    depositPaid: "Depósito",
    promised: "Prometido para",
    overdue: "Atrasado",
    completed: "Pedido terminado",
    saving: "Guardando...",
    markedPaid: "Pedido marcado como cobrado",
    undo: "Deshacer",
  },

  orders: {
    title: "Pedidos",
    newOrder: "Nuevo pedido",
    hideForm: "Cerrar",
    emptyTitle: "Aún no tienes pedidos.",
    emptyBody: "Cuando un cliente te pida algo, aparecerá aquí.",
    completedSection: "Terminados",
  },

  orderForm: {
    title: "Nuevo pedido",
    customer: "Cliente",
    customerPlaceholder: "Escribe el nombre",
    phone: "Teléfono (opcional)",
    phonePlaceholder: "55 1234 5678",
    fromCatalog: "Del catálogo (opcional)",
    chooseProduct: "Elegir producto",
    productName: "Producto",
    productNamePlaceholder: "Ej. Nike Dunk Panda",
    details: "Detalles (opcional)",
    detailsPlaceholder: "Ej. Talla 27",
    cost: "Precio de compra",
    price: "Precio de venta",
    deposit: "Depósito (opcional)",
    depositHint: "Lo que el cliente te dio por adelantado.",
    promisedDate: "Fecha prometida (opcional)",
    notes: "Notas (opcional)",
    willEarn: "Vas a ganar",
    losing: "Estás perdiendo",
    pendingAfter: "Falta cobrar",
    save: "Guardar pedido",
    saving: "Guardando...",
    cancel: "Cancelar",
    errCustomer: "Escribe el nombre del cliente.",
    errProduct: "Escribe el producto.",
    errPrice: "Escribe el precio de venta.",
  },

  catalog: {
    title: "Catálogo",
    addProduct: "Agregar producto",
    referenceCost: "Compras en",
    referencePrice: "Sugieres vender en",
    estimatedProfit: "Ganancia",
    edit: "Editar",
    public: "Público",
    private: "Privado",
    showInPublic: "Mostrar en catálogo público",
    emptyTitle: "Tu catálogo está vacío.",
    emptyBody: "Agrega los productos que normalmente puedes conseguir.",
  },

  productForm: {
    title: "Producto",
    editTitle: "Editar producto",
    name: "Nombre",
    namePlaceholder: "Ej. Dior Sauvage 100ml",
    category: "Categoría",
    referenceCost: "Precio de compra",
    referencePrice: "Precio de venta",
    imageUrl: "Imagen (URL, opcional)",
    image: "Imagen",
    publicDescription: "Descripción pública (opcional)",
    publicDescriptionPlaceholder: "Lo que ven tus clientes en el catálogo",
    privateNotes: "Notas privadas (opcional)",
    showInPublicCatalog: "Mostrar en catálogo público",
    notes: "Notas (opcional)",
    save: "Guardar producto",
    cancel: "Cancelar",
    errName: "Escribe el nombre del producto.",
    errPrice: "Escribe un precio de venta.",
  },

  categories: {
    perfume: "Perfume",
    sneakers: "Tenis",
    cap: "Gorra",
    other: "Otro",
  } as const,

  customers: {
    title: "Clientes",
    addCustomer: "Agregar cliente",
    orders: (n: number) => `${n} ${n === 1 ? "pedido" : "pedidos"}`,
    totalSold: "Vendido",
    totalProfit: "Ganancia",
    pending: "Falta cobrar",
    noOrders: "Sin pedidos",
    resetData: "Recargar datos de ejemplo",
    emptyTitle: "Aún no tienes clientes.",
    emptyBody: "Tus clientes aparecerán aquí.",
  },

  customerForm: {
    title: "Cliente",
    name: "Nombre",
    namePlaceholder: "Ej. Juan",
    phone: "Teléfono (opcional)",
    notes: "Notas (opcional)",
    save: "Guardar cliente",
    cancel: "Cancelar",
    errName: "Escribe el nombre del cliente.",
  },

  confirmReset:
    "¿Borrar todo y volver a los datos de ejemplo? Esto no se puede deshacer.",

  confirmPaid:
    "¿Marcar este pedido como cobrado? Se mueve a terminados y no se puede deshacer.",

  actions: {
    save: "Guardar",
    cancel: "Cancelar",
  },

  auth: {
    email: "Correo",
    password: "Contraseña",
    signIn: "Iniciar sesión",
    signingIn: "Iniciando sesión...",
    signInError: "No se pudo iniciar sesión. Revisa el correo y la contraseña.",
    denied: "Acceso no permitido",
    deniedHint: "Esta cuenta no tiene permiso para administrar el catálogo.",
    signOut: "Cerrar sesión",
  },

  loading: {
    app: "Cargando...",
    catalog: "Cargando catálogo...",
  },

  errorCatalog: {
    title: "No se pudo cargar el catálogo",
    body: "Revisa tu conexión e inténtalo más tarde.",
  },

  errors: {
    load: "No se pudo cargar la información.",
    loadCatalog: "No se pudo cargar el catálogo.",
    save: "No se pudo guardar. Intenta de nuevo.",
    advance: "No se pudo actualizar el pedido. Intenta de nuevo.",
    retry: "Reintentar",
  },

  share: {
    catalog: "Compartir catálogo",
    copied: "Link del catálogo copiado",
    copyFailed: "No se pudo copiar automáticamente. Mantén presionado el link para copiarlo.",
    noPhone:
      "Aún no configuras tu teléfono. Edita VITE_PUBLIC_CATALOG_SELLER_PHONE o tus clientes no podrán pedir.",
  },

  image: {
    fromGallery: "Seleccionar imagen",
    fromCamera: "Tomar foto",
    change: "Cambiar imagen",
    remove: "Quitar imagen",
    uploading: "Subiendo imagen...",
    uploadFailed: "No se pudo subir la imagen. Intenta de nuevo.",
  },

  migration: {
    bannerTitle: "Tu catálogo en la nube está vacío",
    bannerBody: "Importa tus datos para empezar a vender.",
    importLocal: "Importar datos locales",
    importSample: "Importar datos de ejemplo",
    noLocal: "No hay datos locales guardados",
    importing: "Importando...",
  },

  publicCatalog: {
    title: "Catálogo",
    cta: "Pedir por WhatsApp",
    emptyTitle: "No hay productos disponibles.",
    emptyBody: "Vuelve pronto.",
  },
} as const;
