// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Contrato Multi-Factura Tokenizada (DeFi + RWA)
/// @dev Implementa ERC20 como Pool central y facturas gestionadas por ID usando AccessControl.
contract FacturaTokenizada is ERC20, AccessControl, ReentrancyGuard {
    
    // Roles Descentralizados
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // Estados de cada Factura individual
    enum Estado { Recaudando, Completado, Pagado }

    struct Factura {
        uint256 id;
        string empresa;
        string sector;
        string descripcion;
        uint256 metaRecaudacion;
        uint256 rendimientoAnual; // Ej: 10 (10%)
        uint256 diasDuracion;
        uint256 totalRecaudado;
        uint256 pagoTotal; // Capital + Interés entregado por la empresa
        Estado estado;
    }

    uint256 public contadorFacturas;
    mapping(uint256 => Factura) public facturas;
    
    // inversiones[facturaId][address_inversor] = monto_invertido
    mapping(uint256 => mapping(address => uint256)) public inversiones;

    uint256 public constant MONTO_FAUCET = 200 * 10 ** 18;

    // --- EVENTOS ---
    event FaucetReclamado(address indexed usuario, uint256 cantidad);
    event NuevaFactura(uint256 indexed id, string empresa, uint256 meta);
    event InversionRealizada(uint256 indexed facturaId, address indexed inversor, uint256 cantidad);
    event FacturaPagada(uint256 indexed facturaId, uint256 montoAbonado);
    event RetiroRealizado(uint256 indexed facturaId, address indexed inversor, uint256 cantidad);

    constructor() ERC20("ANIKADOL", "ANKD") {
        // Otorgar DEFAULT_ADMIN_ROLE (El creador supremo) y MANAGER_ROLE (Administrador operativo) al deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);

        // Mint inicial al contrato para permitir interactuar al Faucet y simulaciones
        _mint(address(this), 5000000 * 10 ** 18); 
    }

    // ==========================================
    //          FUNCIONES DE ADMINISTRADOR
    // ==========================================

    /// @notice Permite a los Admins crear facturas dinámicas
    function crearFactura(
        string calldata _empresa,
        string calldata _sector,
        string calldata _descripcion,
        uint256 _metaAnkd,
        uint256 _rendimientoAnual,
        uint256 _diasDuracion
    ) external onlyRole(MANAGER_ROLE) {
        contadorFacturas++;
        
        uint256 metaEnWei = _metaAnkd * 10 ** 18;

        facturas[contadorFacturas] = Factura({
            id: contadorFacturas,
            empresa: _empresa,
            sector: _sector,
            descripcion: _descripcion,
            metaRecaudacion: metaEnWei,
            rendimientoAnual: _rendimientoAnual,
            diasDuracion: _diasDuracion,
            totalRecaudado: 0,
            pagoTotal: 0,
            estado: Estado.Recaudando
        });

        emit NuevaFactura(contadorFacturas, _empresa, metaEnWei);
    }

    /// @notice El Admin simula el pago de la empresa a la factura correspondiente
    function finishAndPay(uint256 _facturaId, uint256 _pagoTotalAbonado) external onlyRole(MANAGER_ROLE) {
        require(_facturaId > 0 && _facturaId <= contadorFacturas, "Factura no valida");
        Factura storage f = facturas[_facturaId];

        require(f.estado == Estado.Completado, "La factura debe estar Completada para recibir pago");
        require(balanceOf(msg.sender) >= _pagoTotalAbonado, "El Manager no tiene fondos suficientes");

        // El Admin deposita el Capital + Ganancia devuelta por la empresa
        bool pagoExitoso = transferFrom(msg.sender, address(this), _pagoTotalAbonado);
        require(pagoExitoso, "Transferencia fallida (Falta approve del Admin?)");

        f.pagoTotal = _pagoTotalAbonado;
        f.estado = Estado.Pagado;
        
        emit FacturaPagada(_facturaId, _pagoTotalAbonado);
    }

    // ==========================================
    //            FUNCIONES DE INVERSOR
    // ==========================================

    function faucet() external {
        require(balanceOf(address(this)) >= MONTO_FAUCET, "Sin fondos en la reserva central");
        _transfer(address(this), msg.sender, MONTO_FAUCET);
        emit FaucetReclamado(msg.sender, MONTO_FAUCET);
    }

    function invest(uint256 _facturaId, uint256 amount) external nonReentrant {
        require(_facturaId > 0 && _facturaId <= contadorFacturas, "Factura no valida");
        Factura storage f = facturas[_facturaId];

        require(f.estado == Estado.Recaudando, "Factura no disponible");
        require(amount > 0, "Invierte mas de 0");
        require(f.totalRecaudado + amount <= f.metaRecaudacion, "Asignacion supera la meta");
        
        // Exige approve del usuario a este contrato previo
        bool transaccion = transferFrom(msg.sender, address(this), amount);
        require(transaccion, "Fallo transferencia");

        inversiones[_facturaId][msg.sender] += amount;
        f.totalRecaudado += amount;

        emit InversionRealizada(_facturaId, msg.sender, amount);

        if (f.totalRecaudado == f.metaRecaudacion) {
            f.estado = Estado.Completado;
        }
    }

    function claim(uint256 _facturaId) external nonReentrant {
        require(_facturaId > 0 && _facturaId <= contadorFacturas, "Factura no valida");
        Factura storage f = facturas[_facturaId];

        require(f.estado == Estado.Pagado, "Aun no genera rendimientos listos");
        
        uint256 montoInvertido = inversiones[_facturaId][msg.sender];
        require(montoInvertido > 0, "No tienes capital aqui");

        // Regla Proporcional
        uint256 montoARetirar = (montoInvertido * f.pagoTotal) / f.metaRecaudacion;

        inversiones[_facturaId][msg.sender] = 0; // Prevenir Reentrancy

        bool exito = transfer(msg.sender, montoARetirar);
        require(exito, "Error entregando dividendos");

        emit RetiroRealizado(_facturaId, msg.sender, montoARetirar);
    }
}
