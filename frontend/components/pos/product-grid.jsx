import { Row, Col, Card, CardBody, CardImg, Button } from 'reactstrap'

function ProductGrid({ products, onAddToCart }) {
    const activeProducts = products.filter((product) => product.activo !== false)

    return (
        <Row>
            {activeProducts.map((product) => (
                <Col key={product.id_producto} sm="6" md="4" lg="3" className="mb-4">
                    <Card>
                        <CardImg top width="100%" src={product.imagen || '/default-image.jpg'} alt={product.nombre} />
                        <CardBody>
                            <h5 className="card-title">{product.nombre}</h5>
                            <p className="card-text">{product.descripcion}</p>
                            <p className="card-text">${product.precio_venta.toFixed(2)}</p>
                            <Button color="primary" onClick={() => onAddToCart(product)}>
                                Agregar al Carrito
                            </Button>
                        </CardBody>
                    </Card>
                </Col>
            ))}
        </Row>
    )
}


export default ProductGrid