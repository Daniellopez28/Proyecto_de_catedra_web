import '../src/employee-edit.css'
import { useEffect, useState } from 'react'

function EmployeeEdit({ open, employee, onClose, onSave }) {
    const [status, setStatus] = useState(employee?.status || 'Activo')
    const [monthlySalary, setMonthlySalary] = useState(employee?.monthlySalary || '')

    useEffect(() => {
        if (employee) {
            setStatus(employee.status)
            setMonthlySalary(employee.monthlySalary)
        }
    }, [employee])

    if (!open || !employee) {
        return null
    }

    const handleSubmit = (event) => {
        event.preventDefault()

        const salary = Number(monthlySalary)
        if (!Number.isFinite(salary) || salary < 0) {
            return
        }

        onSave({
            ...employee,
            status,
            monthlySalary: salary,
            deductionNote: `ISSS laboral: 3% · $${(salary * 0.03).toFixed(2)} mensuales. AFP laboral: 7.25% · $${(salary * 0.0725).toFixed(2)} mensuales.`,
        })
        onClose()
    }

    return (
        <main className="employee-edit-overlay" role="dialog" aria-modal="true" aria-labelledby="employee-edit-title">
            <form className="employee-edit-container" onSubmit={handleSubmit}>
                <header className="employee-edit-header">
                    <div>
                        <h1 id="employee-edit-title" style={{color: 'black'}}>Editar expediente</h1>
                        <p>Expediente interno {employee.recordCode}</p>
                    </div>
                    <button type="button" className="employee-edit-close" onClick={onClose} aria-label="Cerrar">×</button>
                </header>

                <section className="employee-edit-section">
                    <h2 style={{color: 'black'}}>Datos del empleado</h2>
                    <div className="employee-edit-grid">
                        <div className="employee-edit-field employee-edit-field-wide">
                            <label htmlFor="edit-name">Nombre completo</label>
                            <input id="edit-name" value={employee.name} disabled />
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-position">Cargo</label>
                            <input id="edit-position" value={employee.position} disabled />
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-branch">Sucursal</label>
                            <input id="edit-branch" value={employee.branch} disabled />
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-contract-date">Fecha de contratación</label>
                            <input id="edit-contract-date" value={employee.contractDate} disabled />
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-contract-type">Tipo de contrato</label>
                            <input id="edit-contract-type" value={employee.contractType} disabled />
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-schedule">Jornada</label>
                            <input id="edit-schedule" value={employee.schedule} disabled />
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-payment">Forma de pago</label>
                            <input id="edit-payment" value={employee.paymentFrequency} disabled />
                        </div>
                    </div>
                </section>

                <section className="employee-edit-section">
                    <h2 style={{color:'black'}}>Datos modificables</h2>
                    <div className="employee-edit-grid">
                        <div className="employee-edit-field">
                            <label htmlFor="edit-status">Estado</label>
                            <select id="edit-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                                <option value="De vacaciones">De vacaciones</option>
                            </select>
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-salary">Salario mensual ($)</label>
                            <input
                                id="edit-salary"
                                type="number"
                                min="0"
                                step="0.01"
                                value={monthlySalary}
                                onChange={(event) => setMonthlySalary(event.target.value)}
                                required
                            />
                        </div>
                    </div>
                </section>

                <section className="employee-edit-section">
                    <h2 style={{color:'black'}}>Afiliaciones laborales</h2>
                    <div className="employee-edit-grid">
                        <div className="employee-edit-field">
                            <label htmlFor="edit-isss">ISSS</label>
                            <input id="edit-isss" value={employee.isss} disabled />
                        </div>
                        <div className="employee-edit-field">
                            <label htmlFor="edit-afp">AFP</label>
                            <input id="edit-afp" value={employee.afp} disabled />
                        </div>
                    </div>
                </section>

                <footer className="employee-edit-actions">
                    <button type="button" className="employee-edit-cancel" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="employee-edit-save">Guardar cambios</button>
                </footer>
            </form>
        </main>
    )
}

export default EmployeeEdit