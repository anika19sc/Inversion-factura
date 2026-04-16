// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Contrato de Inversión en Facturas Tokenizadas (RWA)
/// @dev Implementa ERC20, Ownable y ReentrancyGuard para seguridad
contract FacturaTokenizada is ERC20, Ownable, ReentrancyGuard {
    
    // --- ESTADOS DE LA FACTURA ---
    // Recaudando: Los usuarios pueden invertir.
    // Completado: Se llegó a la meta de recaudación (ya no se admite inversión).
    // Pagado: La empresa pagó el capital + intereses y los inversores pueden retirar (claim).
    enum Estado { Recaudando, Completado, Pagado }
    Estado public estadoActual;

    // --- VARIABLES GLOBALES Y CONSTANTES ---
    uint256 public constant META_RECAUDACION = 1000 * 10 ** 18; // 1,000 ANKD (con 18 decimales)
    uint256 public constant MONTO_FAUCET = 200 * 10 ** 18;      // 200 ANKD para el Faucet
    uint256 public constant PAGO_TOTAL = 1100 * 10 ** 18;       // 1,100 ANKD (Capital + 10% Interés)
    
    uint256 public totalRecaudado;
    
    // Mapeo para registrar la cantidad invertida por cada dirección
    mapping(address => uint256) public inversiones;

    // --- EVENTOS ---
    event FaucetReclamado(address indexed usuario, uint256 cantidad);
    event InversionRealizada(address indexed inversor, uint256 cantidad);
    event FacturaPagada(uint256 montoDevuelto);
    event RetiroRealizado(address indexed inversor, uint256 cantidad);
    
    /// @dev Constructor: Crea el token y define al Owner
    // Nota: A partir de OpenZeppelin v5.0 Ownable requiere recibir el owner en el constructor
    constructor() ERC20("ANIKADOL", "ANKD") Ownable(msg.sender) {
        estadoActual = Estado.Recaudando; // Estado inicial
        
        // Para fines de la Demo, pre-minteamos tokens al contrato
        // Esto permite que el faucet funcione y haya liquidez inicial. 
        _mint(address(this), 1000000 * 10 ** 18); 
    }

    // ==========================================
    //            FUNCIONES PRINCIPALES
    // ==========================================

    /// @notice Permite a cualquier usuario reclamar 200 ANKD de prueba para interactuar
    function faucet() external {
        require(balanceOf(address(this)) >= MONTO_FAUCET, "No hay saldo suficiente en el Faucet");
        
        // Transferimos los tokens de prueba desde el balance del contrato al usuario que la llama
        _transfer(address(this), msg.sender, MONTO_FAUCET);
        
        emit FaucetReclamado(msg.sender, MONTO_FAUCET);
    }

    /// @notice Permite a los usuarios invertir en la factura enviando sus ANKD
    /// @param amount La cantidad de ANKD que el usuario desea invertir
    function invest(uint256 amount) external nonReentrant {
        // Validación 1: Solo se puede invertir si el estado actual es "Recaudando"
        require(estadoActual == Estado.Recaudando, "La fase de recaudacion ha finalizado o no esta activa");
        
        // Validación 2: El monto debe ser mayor a cero
        require(amount > 0, "El monto de inversion debe ser mayor a 0");
        
        // Validación 3: No podemos sobrepasar la meta de recaudación
        require(totalRecaudado + amount <= META_RECAUDACION, "La inversion supera el limite de la meta de recaudacion");
        
        // Transferimos el ANKD del inversor hacia el contrato.
        // NOTA: El usuario debe llamar primero a la función `approve()` en el contrato ERC20 antes de ejecutar `invest()`.
        bool transaccion = transferFrom(msg.sender, address(this), amount);
        require(transaccion, "Transferencia de fondos fallida. Asegurate de dar Allowence (approve).");

        // Registramos la inversión en los mapeos
        inversiones[msg.sender] += amount;
        totalRecaudado += amount;

        emit InversionRealizada(msg.sender, amount);

        // Lógica de cambio de estado: Si logramos reunir el total, la factura pasa a Completado
        if (totalRecaudado == META_RECAUDACION) {
            estadoActual = Estado.Completado;
        }
    }

    /// @notice Simula el momento en el que la empresa pagó la factura con intereses (1,100 ANKD)
    /// @dev Solo puede ser ejecutado por el Owner (Administrador)
    function finishAndPay() external onlyOwner {
        require(estadoActual == Estado.Completado, "La recaudacion no se ha completado aun");
        require(balanceOf(msg.sender) >= PAGO_TOTAL, "El administrador no tiene los 1100 ANKD para pagar");

        // Simulación: El administrador transfiere los 1,100 ANKD prometidos (Capital + 10%) al contrato
        // Para que esto funcione en la Demo real, el Owner deberá hacer `approve()` por 1100 ANKD antes.
        bool pagoExitoso = transferFrom(msg.sender, address(this), PAGO_TOTAL);
        require(pagoExitoso, "Error procesando el pago al contrato");

        // Una vez que el dinero está asegurado en este smart contract, pasamos el estado a "Pagado"
        estadoActual = Estado.Pagado;
        
        emit FacturaPagada(PAGO_TOTAL);
    }

    /// @notice Permite a cada inversor retirar su capital aportado más el interés proporcional
    function claim() external nonReentrant {
        // Solo pueden retirar cuando ya la empresa haya realizado el pago de la factura
        require(estadoActual == Estado.Pagado, "La empresa aun no ha pagado la factura");
        
        // Revisar cuánto dinero invirtió la persona
        uint256 montoInvertido = inversiones[msg.sender];
        require(montoInvertido > 0, "No tienes inversiones o ya realizaste el retiro");

        // ==============================================================
        //  MATEMÁTICA DE REPARTICIÓN (EXACTA)
        // ==============================================================
        // Fórmula de la parte proporcional: 
        //   Porcentaje_de_Usuario = montoInvertido / META_RECAUDACION 
        //   Retiro_del_Usuario = Porcentaje_de_Usuario * PAGO_TOTAL
        //
        // En Solidity no hay números flotantes, así que siempre multiplicamos 
        // ANTES de dividir para evitar pérdida de precisión (truncamientos).
        //
        uint256 montoARetirar = (montoInvertido * PAGO_TOTAL) / META_RECAUDACION;

        // Efecto (Checks-Effects-Interactions pattern): Evitamos ataques de reentrada
        // estableciendo la inversión del usuario a 0 ANTES de hacer la transferencia.
        inversiones[msg.sender] = 0;

        // Interacción: Realizamos la transferencia final al inversor.
        bool exito = transfer(msg.sender, montoARetirar);
        require(exito, "La transferencia de retiro fallo");

        emit RetiroRealizado(msg.sender, montoARetirar);
    }
}
