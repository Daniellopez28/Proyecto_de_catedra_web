import {useState} from 'react';
import ProductGrid from './product-grid.jsx';
import OrderSummary from './order-summary.jsx';
import {Row, Col} from 'reactstrap';
import { productosEjemplo } from '../../data/productos-ejemplo';

function POSComponent() {
    const [items, setItems] = useState([]);
    
    const handleAddToCart = (product) => {
        const existingItem = items.find((item) => item.id_producto === product.id_producto);
        if (existingItem) {
            setItems(items.map((item) => 
                item.id_producto === product.id_producto 
                    ? {...item, cantidad: item.cantidad + 1} 
                    : item
            ));
        } else {
            setItems([...items, {...product, cantidad: 1}]);
        }
    }

    const handleChangeQuantity = (id_producto, newQuantity) => {
        setItems(items.map((item) => 
            item.id_producto === id_producto
                ? {...item, cantidad: newQuantity}
                : item
        ));
    }

    const handleRemoveItem = (id_producto) => {
        setItems(items.filter((item) => item.id_producto !== id_producto));
    }

    const handleEmptyCart = () => {
        setItems([]);
    }
    
    
    return (
        <div className="container mt-4">
            <Row>
                <Col md={8}>
                    <h2>Productos</h2>
                    <ProductGrid products={ productosEjemplo } onAddToCart={handleAddToCart} />
                </Col>
                <Col md={4}>
                    <OrderSummary 
                    items={items} 
                    onChangeQuantity={handleChangeQuantity}
                    onRemoveItem={handleRemoveItem}
                    onEmptyCart={handleEmptyCart} 
                    />
                </Col>
            </Row>
        </div>
    );
}

export default POSComponent;
