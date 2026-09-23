
package com.hotelsol.products;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public List<Product> findAll() {
        return productService.findAll();
    }

    @GetMapping("/{id}")
    public Product findById(@PathVariable Long id) {
        return productService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@RequestBody Product product) {
        return productService.create(product);
    }

    @PutMapping("/{id}")
    public Product update(
            @PathVariable Long id,
            @RequestBody Product product) {
        return productService.update(id, product);
    }

    /**
     * Aumentar stock.
     * Uso administrativo.
     */
    @PatchMapping("/{id}/stock")
    public Product addStock(
            @PathVariable Long id,
            @RequestParam Integer quantity) {
        return productService.addStock(id, quantity);
    }

    /**
     * Disminuir stock.
     *
     * Se utiliza para:
     * - Consumo de personal
     * - Productos utilizados por el personal
     *
     * NO modifica la lógica de aumento de stock.
     */
    @PatchMapping("/{id}/stock/decrease")
    public Product decreaseStock(
            @PathVariable Long id,
            @RequestParam Integer quantity) {
        return productService.decreaseStock(
                id,
                quantity);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }
}
