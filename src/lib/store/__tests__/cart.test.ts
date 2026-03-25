import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../cart';

const mockItem = {
  product_id: 'prod-1',
  name: 'Camiseta Básica',
  price: 29.99,
  image_url: null,
  stock: 5,
};

const mockItem2 = {
  product_id: 'prod-2',
  name: 'Pantalón Chino',
  price: 49.99,
  image_url: null,
  stock: 3,
};

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe('addItem', () => {
    it('añade un producto nuevo', () => {
      useCartStore.getState().addItem(mockItem);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].product_id).toBe('prod-1');
      expect(items[0].quantity).toBe(1);
    });

    it('incrementa cantidad si el producto ya existe', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('no excede el stock disponible', () => {
      const lowStock = { ...mockItem, stock: 2 };
      useCartStore.getState().addItem(lowStock);
      useCartStore.getState().addItem(lowStock);
      useCartStore.getState().addItem(lowStock); // debería ignorarse
      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(2);
    });

    it('no añade producto con stock=0', () => {
      const noStock = { ...mockItem, stock: 0 };
      useCartStore.getState().addItem(noStock);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('removeItem', () => {
    it('elimina un producto del carrito', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem2);
      useCartStore.getState().removeItem('prod-1');
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].product_id).toBe('prod-2');
    });

    it('no falla al eliminar un producto que no existe', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().removeItem('inexistente');
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('actualiza la cantidad de un producto', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().updateQuantity('prod-1', 3);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it('elimina producto si quantity=0', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().updateQuantity('prod-1', 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('elimina producto si quantity es negativa', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().updateQuantity('prod-1', -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('clampea cantidad al stock máximo', () => {
      useCartStore.getState().addItem(mockItem); // stock=5
      useCartStore.getState().updateQuantity('prod-1', 100);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });
  });

  describe('clearCart', () => {
    it('vacía el carrito completamente', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem2);
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('totalItems', () => {
    it('suma las cantidades correctamente', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem2);
      expect(useCartStore.getState().totalItems()).toBe(3);
    });

    it('devuelve 0 con carrito vacío', () => {
      expect(useCartStore.getState().totalItems()).toBe(0);
    });
  });

  describe('totalPrice', () => {
    it('calcula el total correctamente', () => {
      useCartStore.getState().addItem(mockItem); // 29.99 x 1
      useCartStore.getState().addItem(mockItem2); // 49.99 x 1
      expect(useCartStore.getState().totalPrice()).toBeCloseTo(79.98);
    });

    it('calcula correctamente con múltiples cantidades', () => {
      useCartStore.getState().addItem(mockItem);
      useCartStore.getState().addItem(mockItem); // 29.99 x 2 = 59.98
      expect(useCartStore.getState().totalPrice()).toBeCloseTo(59.98);
    });

    it('devuelve 0 con carrito vacío', () => {
      expect(useCartStore.getState().totalPrice()).toBe(0);
    });
  });
});
