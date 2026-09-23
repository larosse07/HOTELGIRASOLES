
package com.hotelsol.products;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // =========================================
    // LISTAR TODOS LOS PRODUCTOS
    // =========================================
    public List<Product> findAll() {
        return productRepository.findAll();
    }

    // =========================================
    // BUSCAR PRODUCTO POR ID
    // =========================================
    public Product findById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Producto no encontrado"));
    }

    // =========================================
    // CREAR PRODUCTO
    // =========================================
    @Transactional
    public Product create(Product product) {

        if (productRepository.existsByNameIgnoreCase(
                product.getName())) {
            throw new RuntimeException(
                    "El producto ya existe");
        }

        if (product.getStock() == null) {
            product.setStock(0);
        }

        return productRepository.save(product);
    }

    // =========================================
    // ACTUALIZAR PRODUCTO
    // =========================================
    @Transactional
    public Product update(
            Long id,
            Product data) {

        Product product = findById(id);

        product.setName(data.getName());
        product.setPrice(data.getPrice());
        product.setStock(data.getStock());

        return productRepository.save(product);
    }

    // =========================================
    // ELIMINAR PRODUCTO
    // =========================================
    @Transactional
    public void delete(Long id) {

        Product product = findById(id);

        productRepository.delete(product);
    }

    // =========================================
    // AUMENTAR STOCK
    // =========================================
    @Transactional
    public Product addStock(
            Long id,
            Integer quantity) {

        if (quantity == null ||
                quantity <= 0) {
            throw new RuntimeException(
                    "La cantidad debe ser mayor a cero");
        }

        Product product = findById(id);

        int currentStock = product.getStock() == null
                ? 0
                : product.getStock();

        product.setStock(
                currentStock + quantity);

        return productRepository.save(product);
    }

    // =========================================
    // DISMINUIR STOCK
    //
    // USADO PARA:
    // - GASTO DE PERSONAL
    // - CONSUMO DE PRODUCTO POR PERSONAL
    // =========================================
    @Transactional
    public Product decreaseStock(
            Long id,
            Integer quantity) {

        if (quantity == null ||
                quantity <= 0) {
            throw new RuntimeException(
                    "La cantidad debe ser mayor a cero");
        }

        Product product = findById(id);

        int currentStock = product.getStock() == null
                ? 0
                : product.getStock();

        if (quantity > currentStock) {
            throw new RuntimeException(
                    "Stock insuficiente. Disponible: "
                            + currentStock);
        }

        product.setStock(
                currentStock - quantity);

        return productRepository.save(product);
    }
}
