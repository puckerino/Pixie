PixieShop.register("nombre-tienda", {
  items: [],

  hooks: {
    renderItem({ item, template, shop }) {
      const node = template();

      // Rellenar la tarjeta.

      return node;
    },

    renderCartItem({
      item,
      entry,
      sectionName,
      template,
      shop
    }) {
      const node = template();

      // Rellenar la entrada del carrito.

      return node;
    },

    buildMessage({
      cart,
      sections,
      items,
      totals,
      utils,
      shop
    }) {
      // Devolver el mensaje que se publicará.

      return "";
    }
  }
});
