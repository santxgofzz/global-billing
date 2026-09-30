# Global Billing: flujos intuitivos, conectados y rápidos

Fecha: 29 de septiembre de 2026  
Estado: aprobado por el usuario el 29 de septiembre de 2026
Repositorio: `santxgofzz/global-billing`

## 1. Propósito

Global Billing debe permitir que Santiago, Juan Pablo y Johan registren y consulten la operación financiera sin conocer UUID, nombres técnicos del modelo ni reglas implícitas. Crear un cliente, contrato, cobro, pago, gasto o provisión debe guiar al usuario, mostrar el impacto financiero antes de confirmar y conectar el nuevo registro con el siguiente paso natural.

El backend continúa siendo la fuente de verdad. La mejora no convierte el producto en contabilidad legal ni altera las reglas de integridad financiera ya documentadas.

## 2. Problemas confirmados

1. El frontend usa un formulario genérico definido en `module-page.tsx`; por ello presenta campos como `ID del cliente` y omite relaciones y campos existentes en el dominio.
2. Los contratos se crean sin su versión inicial ni regla de cobro, de modo que el flujo no deja el contrato listo para generar calendario.
3. Los pagos se crean separados de sus asignaciones a cuotas; esto hace difícil representar pagos parciales o anticipados y permite una experiencia incompleta.
4. Gastos, provisiones, documentos y movimientos internos no exponen todas las relaciones y decisiones requeridas por el negocio.
5. Las tablas muestran UUID en lugar de nombres y contexto comercial.
6. Las alertas de cobro tienen poca anticipación y no llevan al usuario a una acción específica.
7. La ficha de cliente solicita nueve colecciones al abrirse, incluso si sus pestañas nunca se consultan.
8. La sidebar contraída conserva geometría y textos pensados para el modo expandido.
9. Varios controles de configuración son superficies estáticas y no permiten administrar los catálogos que los formularios necesitan.

## 3. Principios de experiencia

- No mostrar UUID ni pedirlos al usuario.
- Usar lenguaje cotidiano de Global Automate y explicar términos financieros inevitables.
- Pedir primero la decisión conceptual; mostrar después únicamente los campos aplicables.
- Presentar ejemplos reales pero no información sensible inventada.
- Mostrar el impacto financiero antes de confirmar acciones críticas.
- Mantener una sola fuente de verdad: los cálculos se ejecutan en el backend.
- Conservar historial y auditoría; ninguna mejora convierte ediciones históricas en sobrescrituras silenciosas.
- Permitir completar un flujo sin saltar manualmente entre cinco módulos.
- Cargar solo la información visible o necesaria para la siguiente decisión.

## 4. Lenguaje del producto

| Término actual | Etiqueta nueva | Ayuda visible |
|---|---|---|
| Prefijo de cobro | Código para numerar cuentas de cobro | Código corto usado en consecutivos. Ejemplo: `HUMANOS-001`. Se sugiere desde el nombre del cliente. |
| ID del cliente | Cliente | Lista por nombre comercial. |
| ID de la cuenta | Cuenta donde recibimos el dinero | Lista por banco, nombre y terminación. |
| Alcance | ¿A quién pertenece este gasto? | Global Automate, un cliente o varios clientes. |
| Propietario financiero | ¿Para quién se reserva este dinero? | Global Automate o un cliente. |
| Monto objetivo | ¿Cuánto costará esta obligación? | Valor esperado que se quiere tener reservado. |
| Inicio de aportes | ¿Desde cuándo empezamos a separar dinero? | Puede ser este mes, el siguiente o una fecha personalizada. |
| Incremento estimado | Aumento esperado del precio | Porcentaje opcional para anticipar la renovación. |
| Billing rule | Forma de cobro | Mensual, dos pagos al mes, trimestral, fechas específicas o cuotas manuales. |
| Allocation | Aplicación del pago | Distribución del dinero recibido entre cobros pendientes. |
| Waiver | Condonar cobro | Resuelve el saldo sin registrar dinero recibido. |

Las API conservan nombres técnicos estables; la traducción ocurre en la interfaz y en mensajes de validación.

## 5. Arquitectura de formularios

### 5.1 Componentes compartidos

Se incorporará una biblioteca interna de formularios sobre el design system existente:

- `FormField`: etiqueta, ayuda, ejemplo, error y relación accesible mediante `aria-describedby`.
- `EntitySelect`: selector por nombre con estado de carga, opción vacía clara y enlace para crear un catálogo faltante cuando corresponda.
- `DependentEntitySelect`: limpia y recarga opciones cuando cambia su entidad padre.
- `MoneyInput`: recibe pesos enteros, muestra separadores colombianos y envía enteros COP.
- `PercentageInput`: trabaja visualmente con porcentajes y transforma a puntos básicos en el borde de la API.
- `FormSection`: agrupa campos bajo una pregunta comprensible.
- `Wizard`: pasos, progreso, navegación, validación por paso y resumen final.
- `ImpactSummary`: resume movimientos, reservas, saldos o registros que se crearán.
- `InlineCreate`: permite crear categorías, cuentas o servicios sin perder el formulario actual.

Los formularios simples usan modal. Los flujos que combinan varias entidades o requieren una vista previa usan página o drawer amplio con pasos. Los valores obligatorios se marcan en texto, no únicamente por color.

### 5.2 Catálogos y etiquetas relacionadas

El backend expondrá endpoints de opciones livianos y serializadores de lectura que incluyan etiquetas relacionadas. Cada opción tendrá como mínimo `id`, `label` y, cuando aporte contexto, `description`.

Catálogos requeridos:

- clientes activos;
- proyectos filtrados por cliente;
- contratos filtrados por cliente y proyecto;
- servicios activos;
- cuentas bancarias activas;
- categorías de gasto activas;
- emisores activos, indicando el predeterminado;
- fondos activos;
- periodos financieros;
- cuotas con saldo filtradas por cliente;
- gastos elegibles para consumir una provisión.

Las tablas mostrarán nombres derivados (`client_name`, `account_name`, `category_name`, `contract_name`) sin reemplazar las claves foráneas de escritura.

## 6. Flujos por módulo

### 6.1 Clientes

El formulario se divide en tres secciones:

1. Información comercial: nombre comercial, razón social opcional y estado.
2. Contacto: persona, correo, teléfono y notas internas.
3. Datos para cuentas de cobro: código consecutivo, nombre de facturación, tipo y número de identificación opcionales, correo, dirección e instrucciones de pago.

El código se genera desde el nombre: mayúsculas, sin tildes, caracteres seguros y máximo configurado. El usuario lo confirma antes de guardar. Crear el cliente y su perfil de facturación será una única operación atómica.

Después de guardar se ofrecerán acciones claras: `Crear proyecto`, `Crear contrato` o `Ir al cliente`.

### 6.2 Proyectos

Campos: cliente, nombre, descripción, servicios, estado, fecha de inicio y fecha final opcional. Cliente y servicios se eligen por nombre. Desde la ficha de un cliente el selector llega preseleccionado.

### 6.3 Contratos

Asistente de cinco pasos:

1. Cliente, proyecto opcional, nombre y servicios.
2. Fecha inicial, fecha final o duración, estado y renovación.
3. Valor del periodo o valor único, fecha efectiva y motivo de la versión inicial.
4. Forma de cobro: único, mensual, trimestral, cada X meses, dos pagos al mes, porcentajes inicial/entrega, fechas específicas o cuotas manuales.
5. Vista previa del calendario y confirmación.

Para dos pagos al mes se muestran días y porcentajes; la suma debe ser exactamente 100 %. Una obligación mensual de $550.000 dividida 50/50 crea una obligación por $550.000 y dos cuotas de $275.000.

El contrato, versión inicial, servicios y regla de cobro se crean dentro de una transacción. El calendario se confirma explícitamente; no se generan obligaciones si la vista previa presenta errores.

### 6.4 Cobros y cuentas de cobro

La pantalla de cobros agrupa por cliente y periodo, con filtros de estado y vencimiento. Cada cuota muestra cliente, contrato, periodo, fecha, valor, pagado, condonado y saldo.

Acciones:

- `Preparar cuenta de cobro`;
- `Registrar pago` con cliente y cuota preseleccionados;
- `Condonar` con confirmación, valor, motivo e impacto;
- `Ver detalle`.

La generación de cuenta selecciona por defecto el emisor configurado, permite cambiarlo, muestra concepto, periodo, valor y consecutivo estimado, y termina en estado `Pendiente de revisión`. También crea el mensaje profesional asociado y permite generar otra variante.

### 6.5 Pagos

Asistente de cuatro pasos:

1. Cliente, cuenta bancaria, valor, fecha, referencia, notas y comprobante opcional.
2. Cuotas pendientes del cliente, ordenadas por vencimiento.
3. Sugerencia de aplicación a la deuda más antigua, editable por el usuario.
4. Resumen: recibido, aplicado, saldo pendiente de aplicar, cuotas resueltas y cuotas parciales.

El sistema permite dejar saldo sin aplicar como anticipo. Nunca lo asigna a periodos futuros sin mostrarlo. La creación del pago, transacción bancaria y allocations será atómica. Si una asignación excede el pago o el saldo de una cuota, toda la operación se rechaza con un mensaje por campo.

### 6.6 Gastos

La primera decisión es `¿A quién pertenece este gasto?`:

- Global Automate: categoría, concepto, valor, fecha, vencimiento, cuenta/pago y comprobante.
- Un cliente: añade cliente y permite proyecto, contrato o servicio.
- Varios clientes: añade método de reparto y vista previa de allocations.

Métodos compartidos: partes iguales, porcentajes, montos y proporcional al ingreso real del periodo. La confirmación guarda el snapshot. Registrar el gasto pagado y su salida bancaria será una única operación.

### 6.7 Provisiones

Campos: nombre, propietario, cliente/proyecto cuando aplica, categoría, costo actual, incremento esperado, objetivo calculado, vencimiento, frecuencia, inicio de aportes y tratamiento del excedente.

Antes de guardar se muestran meses disponibles, aporte sugerido y fecha del primer aporte. La ficha mantiene `Registrar aporte`, `Consumir reserva` y `Crear siguiente ciclo`, todas con confirmación e impacto.

### 6.8 Fondos y tesorería

Crear fondo solo solicita nombre, propósito y estado. Su ficha incorpora aportes, retiros y transferencias entre fondos. Los movimientos muestran explícitamente que no son gastos.

Cuentas y transferencias internas usan selectores con banco, nombre y terminación. Origen y destino no pueden coincidir. El resumen confirma salida, entrada e impacto neto cero.

### 6.9 Documentos

El flujo permite seleccionar tipo, cliente, proyecto y contrato relacionados, fecha, notas y archivo. La primera carga crea `Document` y `DocumentVersion`; cargas posteriores crean versiones nuevas sin reemplazar el archivo anterior.

### 6.10 Configuración

Las superficies de configuración administrarán de forma real:

- emisores;
- cuentas bancarias;
- categorías de gasto;
- servicios;
- fondos;
- política de distribución;
- preferencias de notificación;
- marca y sistema.

Los datos sensibles de emisores continúan en base de datos y nunca se codifican en frontend.

## 7. Alertas y trabajo pendiente

Se crearán notificaciones idempotentes para:

- pago en 7 días;
- pago en 3 días;
- pago mañana;
- pago vencido, evitando una notificación duplicada diaria;
- cuenta de cobro pendiente de revisión;
- contrato por vencer en 30 días;
- provisión con vencimiento cercano o cobertura insuficiente.

Cada notificación tendrá `action_url` al objeto exacto. La campana mostrará contador no leído y permitirá marcar una notificación o todas como leídas. El dashboard tendrá una sección `Necesita atención` priorizada por vencimiento e impacto.

## 8. Navegación y sidebar

En modo contraído:

- ancho estable de 76–84 px;
- logo compacto centrado;
- títulos de sección ocultos visualmente;
- iconos centrados dentro de objetivos de al menos 40 px;
- tooltip accesible con el nombre;
- indicador activo visible sin desplazar el icono;
- botón de expansión fijo y centrado.

La preferencia se conserva localmente. En móvil se mantiene el drawer con cierre por botón, overlay y navegación. Los formularios complejos pasan a página completa en móvil.

## 9. Rendimiento

- Configuración global de TanStack Query con `staleTime` razonable, reintentos limitados y sin refetch de foco para catálogos estables.
- Paginación inicial de 20 registros; no solicitar 50–100 por defecto.
- Carga de pestañas de cliente únicamente al activarlas.
- Endpoint de resumen del cliente para métricas; no descargar todas sus colecciones para calcular contadores.
- Invalidaciones específicas después de mutaciones.
- Catálogos livianos separados de listados completos.
- Eliminar `transition: all` y reducir blur/sombras costosas en tablas y móviles.
- Mantener la refracción avanzada desactivada por defecto; el fallback conserva la identidad glass.
- Revisar `select_related` y `prefetch_related` en endpoints de lectura con relaciones visibles.

## 10. Errores y estados

- Los errores del backend se preservan por campo y se traducen a español comprensible.
- Los formularios no se cierran al fallar.
- Guardar se bloquea mientras la operación está pendiente para evitar duplicados.
- Los estados vacíos explican el requisito previo: por ejemplo, si no hay cuentas bancarias, ofrecen `Configurar cuenta bancaria`.
- Si un selector dependiente no tiene resultados, explica por qué en lugar de mostrar una lista vacía.
- Las operaciones atómicas devuelven un único error y no dejan registros parciales.

## 11. Contratos de API

Se añadirán endpoints orientados a casos de uso, sin retirar inicialmente los CRUD existentes:

- `GET /api/v1/lookups/<resource>/` para opciones livianas y filtrables.
- `POST /api/v1/clients/onboard/` para cliente + perfil de facturación.
- `POST /api/v1/contracts/setup/` para contrato + versión + servicios + regla, con modo de vista previa.
- `POST /api/v1/payments/register/` para pago + transacción + allocations + comprobante opcional.
- `POST /api/v1/expenses/register/` para gasto + pago + allocations + comprobante opcional.
- Acciones existentes de cuenta de cobro, condonación, provisión y transferencia recibirán serializers explícitos de entrada.

Todos usarán `transaction.atomic`, validación de dominio y auditoría. Las respuestas incluirán el objeto principal, resultados relacionados y un resumen de impacto.

## 12. Accesibilidad

- Etiquetas reales, ayudas enlazadas y errores asociados al campo.
- Navegación completa por teclado en modal, drawer, tabs y selects.
- Focus visible y devolución del foco al cerrar.
- Estados comunicados con texto e icono, no solo color.
- Objetivos táctiles de al menos 40 px.
- `aria-live` para guardado, error y recalculo de resúmenes.
- `prefers-reduced-motion` reduce transiciones y elimina animación decorativa.
- Se verificará contraste, reflow móvil y zoom; una captura por sí sola no se considerará prueba de cumplimiento WCAG.

## 13. Pruebas de aceptación

### Backend

- Crear cliente y perfil en una operación.
- Crear contrato completo mensual, quincenal y personalizado.
- Vista previa no persiste datos.
- Registrar pago completo, parcial, adelantado y con saldo sin aplicar.
- Fallo de allocation revierte pago y transacción.
- Registrar gasto directo y compartido con snapshot exacto.
- Crear y recalcular provisión.
- Alertas 7/3/1/vencido son idempotentes.
- Lookup filtra relaciones y no expone registros inactivos por defecto.
- Permisos y auditoría para cada endpoint de caso de uso.

### Frontend

- Los formularios no muestran campos `ID` ni UUID.
- Los selectores dependientes cambian con el cliente.
- Ayudas, ejemplos y errores son visibles y accesibles.
- MoneyInput conserva enteros COP.
- Sidebar expandida, contraída y móvil mantienen alineación.
- Pestañas diferidas no consultan hasta abrirse.
- El resumen de impacto coincide con la solicitud enviada.

### E2E

1. Cliente → proyecto → contrato quincenal → calendario.
2. Cuota → cuenta de cobro → mensaje generado.
3. Pago parcial → saldo correcto.
4. Pago adelantado aplicado a varias cuotas.
5. Gasto compartido → snapshot confirmado.
6. Provisión → aporte extraordinario → nuevo sugerido.
7. Notificación → registro exacto.
8. Navegación con sidebar contraída y viewport móvil.

## 14. Secuencia de entrega

1. Infraestructura de formularios, lookups, etiquetas relacionadas y errores.
2. Clientes, proyectos y catálogos administrativos.
3. Contrato completo y vista previa del calendario.
4. Cobros, cuenta de cobro, mensajes y pagos atómicos.
5. Gastos, provisiones, fondos, tesorería y documentos.
6. Alertas, dashboard de pendientes y campana.
7. Sidebar, rendimiento, responsive y accesibilidad.
8. E2E, revisión visual autenticada, documentación y despliegue.

Cada etapa debe cerrar con pruebas verdes y un commit descriptivo. No se desplegará automáticamente al VPS; el repositorio quedará preparado y el despliegue se hará con verificación posterior.

## 15. Fuera de alcance

- Contabilidad legal, PUC, DIAN, impuestos o facturación electrónica.
- Portal de clientes.
- Conexión automática a bancos.
- Envío real de WhatsApp o Web Push.
- Costeo de horas o mano de obra de socios.
- Reemplazo de las reglas financieras o del histórico migrado.

## 16. Criterio de terminado

La mejora se considera terminada cuando un administrador puede completar los flujos E2E sin copiar identificadores, entiende qué poner en cada campo, recibe alertas accionables, puede generar una cuenta de cobro y aplicar un pago desde el contexto correcto, y las pruebas, lint, typecheck y build terminan sin errores. Las métricas financieras deben conservar sus invariantes y trazabilidad.
