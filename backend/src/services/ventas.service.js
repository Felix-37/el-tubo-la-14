const modelo = require('../models/ventas.model');
const caja = require('../models/caja.model');
const HttpError = require('../utils/httpError');
const { validarBody } = require('../utils/validar');
const { enTransaccion } = require('../utils/transaccion');

const FORMAS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'CREDITO'];
const MAX_LINEAS = 50;

const pesos = (n) => Math.round(n * 100) / 100;
const invalido = (mensaje) => new HttpError(400, 'Datos inválidos', [mensaje]);

// Revisa las líneas y junta las que repiten presentación.
function validarLineas(lineas) {
  if (!Array.isArray(lineas) || lineas.length === 0) throw invalido('La venta necesita al menos una línea en "lineas"');
  if (lineas.length > MAX_LINEAS) throw invalido(`La venta admite máximo ${MAX_LINEAS} líneas`);

  const porPresentacion = new Map();
  lineas.forEach((l, i) => {
    const { presentacion_id: id, cantidad } = l || {};
    if (!Number.isInteger(id) || id <= 0) throw invalido(`Línea ${i + 1}: "presentacion_id" debe ser un entero positivo`);
    if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 100000) {
      throw invalido(`Línea ${i + 1}: "cantidad" debe ser un entero mayor que 0`);
    }
    porPresentacion.set(id, (porPresentacion.get(id) || 0) + cantidad);
  });
  return [...porPresentacion].map(([presentacion_id, cantidad]) => ({ presentacion_id, cantidad }));
}

// Registra una venta de material por unidades en la caja abierta.
// Todo en una transacción: consecutivo, encabezado, líneas, descuento de
// existencia, movimiento de inventario y, si es a crédito, el cargo en cartera.
async function registrar(actor, body) {
  const datos = validarBody(body, {
    forma_pago: { tipo: 'texto', requerido: true, max: 13 },
    cliente_id: { tipo: 'entero', min: 1 },
    valor_recibido: { tipo: 'numero', min: 0, decimales: 2 },
    observacion: { tipo: 'texto', max: 400 },
  });
  if (!FORMAS_PAGO.includes(datos.forma_pago)) throw invalido(`"forma_pago" debe ser una de: ${FORMAS_PAGO.join(', ')}`);
  if (datos.forma_pago === 'CREDITO' && datos.cliente_id === null) throw invalido('La venta a crédito necesita "cliente_id"');
  if (datos.forma_pago === 'EFECTIVO' && datos.valor_recibido === null) throw invalido('La venta en efectivo necesita "valor_recibido"');
  const lineas = validarLineas(body.lineas);

  const ventaId = await enTransaccion(async (cliente) => {
    const cajaAbierta = await caja.abierta(cliente, 'compartido');
    if (!cajaAbierta) throw new HttpError(409, 'No hay una caja abierta; ábrala antes de vender');

    let clienteVenta = null;
    if (datos.cliente_id !== null) {
      clienteVenta = await modelo.clienteParaVenta(datos.cliente_id, cliente);
      if (!clienteVenta || !clienteVenta.activo) throw invalido(`No existe un cliente activo con id ${datos.cliente_id}`);
    }

    const presentaciones = await modelo.presentacionesParaVenta(lineas.map((l) => l.presentacion_id), cliente);
    const porId = new Map(presentaciones.map((p) => [p.presentacion_id, p]));

    const detalle = lineas.map((l, i) => {
      const p = porId.get(l.presentacion_id);
      if (!p || !p.activa) throw invalido(`No existe una presentación activa con id ${l.presentacion_id}`);
      if (p.es_cortable) {
        throw invalido(`${p.producto} se vende por corte; esta entrega solo registra ventas por unidad`);
      }
      if (p.existencia < l.cantidad) {
        throw new HttpError(409, `Existencia insuficiente de ${p.producto} (${p.referencia}): hay ${p.existencia}, se piden ${l.cantidad}`);
      }
      return {
        linea: i + 1,
        presentacion_id: p.presentacion_id,
        descripcion: `${p.producto}${p.medida ? ` ${p.medida}` : ''} (${p.referencia})`.slice(0, 200),
        cantidad: l.cantidad,
        precio_unitario: p.precio_venta,
        valor: pesos(p.precio_venta * l.cantidad),
      };
    });

    const total = pesos(detalle.reduce((s, l) => s + l.valor, 0));
    if (total <= 0) throw invalido('El total de la venta debe ser mayor que 0 (revise los precios de las presentaciones)');
    let recibido = total;
    let cambio = 0;
    if (datos.forma_pago === 'EFECTIVO') {
      if (datos.valor_recibido < total) throw invalido(`El valor recibido (${datos.valor_recibido}) no alcanza para el total (${total})`);
      recibido = pesos(datos.valor_recibido);
      cambio = pesos(recibido - total);
    }
    if (datos.forma_pago === 'CREDITO') {
      recibido = 0;
      const disponible = pesos(clienteVenta.cupo_credito - clienteVenta.saldo);
      if (total > disponible) {
        throw new HttpError(409, `La venta (${total}) supera el cupo disponible de ${clienteVenta.nombre} (${disponible})`);
      }
    }

    const numero = await modelo.siguienteNumero(cliente);
    const id = await modelo.insertarVenta({
      numero,
      cajaId: cajaAbierta.caja_id,
      usuarioId: actor.id,
      clienteId: datos.cliente_id,
      formaPago: datos.forma_pago,
      subtotal: total,
      total,
      recibido,
      cambio,
      observacion: datos.observacion,
    }, cliente);
    for (const l of detalle) await modelo.insertarLinea(id, l, actor.id, cliente);
    if (datos.forma_pago === 'CREDITO') await modelo.cargarCartera(datos.cliente_id, total, id, actor.id, numero, cliente);
    return id;
  });

  return modelo.obtener(ventaId);
}

// El CAJERO ve solo las ventas que registró; el ADMIN ve todas.
async function listar(actor) {
  return modelo.listar({ usuarioId: actor.rol === 'ADMIN' ? null : actor.id });
}

// La propiedad la valida la ruta (propietarioDelRegistro) antes de llegar aquí.
async function obtener(id) {
  return modelo.obtener(Number(id));
}

async function clientes() {
  return modelo.clientesParaVenta();
}

module.exports = { registrar, listar, obtener, clientes };
