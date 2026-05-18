// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CertificateSupplyChain
/// @notice PoC registry for certificate or supply-chain assets with role-based status tracking.
contract CertificateSupplyChain {
    enum Status {
        Created,
        Issued,
        Suspended,
        Revoked
    }

    enum Role {
        None,
        Admin,
        Issuer,
        Verifier
    }

    struct Asset {
        string assetId;
        string holderName;
        string assetName;
        string metadataURI;
        string issuedDate;
        address issuer;
        Status status;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    struct HistoryItem {
        Status status;
        address actor;
        string note;
        uint256 timestamp;
    }

    address public owner;
    mapping(address => Role) public roles;
    mapping(bytes32 => Asset) private assets;
    mapping(bytes32 => HistoryItem[]) private histories;

    event RoleChanged(address indexed account, Role indexed role, address indexed actor);
    event AssetCreated(
        bytes32 indexed assetKey,
        string assetId,
        string holderName,
        string assetName,
        address indexed issuer
    );
    event AssetStatusUpdated(
        bytes32 indexed assetKey,
        string assetId,
        Status indexed oldStatus,
        Status indexed newStatus,
        address actor,
        string note
    );
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner || roles[msg.sender] == Role.Admin, "ONLY_ADMIN");
        _;
    }

    modifier onlyIssuer() {
        require(
            msg.sender == owner || roles[msg.sender] == Role.Admin || roles[msg.sender] == Role.Issuer,
            "ONLY_ISSUER"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        roles[msg.sender] = Role.Admin;
        emit RoleChanged(msg.sender, Role.Admin, msg.sender);
    }

    function setRole(address account, Role role) external onlyAdmin {
        require(account != address(0), "ZERO_ADDRESS");
        roles[account] = role;
        emit RoleChanged(account, role, msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        address oldOwner = owner;
        owner = newOwner;
        roles[newOwner] = Role.Admin;
        emit OwnershipTransferred(oldOwner, newOwner);
        emit RoleChanged(newOwner, Role.Admin, msg.sender);
    }

    function createAsset(
        string calldata assetId,
        string calldata holderName,
        string calldata assetName,
        string calldata metadataURI,
        string calldata issuedDate
    ) external onlyIssuer returns (bytes32 assetKey) {
        assetKey = getAssetKey(assetId);
        require(bytes(assetId).length > 0, "EMPTY_ASSET_ID");
        require(!assets[assetKey].exists, "ASSET_EXISTS");

        assets[assetKey] = Asset({
            assetId: assetId,
            holderName: holderName,
            assetName: assetName,
            metadataURI: metadataURI,
            issuedDate: issuedDate,
            issuer: msg.sender,
            status: Status.Created,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        histories[assetKey].push(
            HistoryItem({status: Status.Created, actor: msg.sender, note: "Asset created", timestamp: block.timestamp})
        );

        emit AssetCreated(assetKey, assetId, holderName, assetName, msg.sender);
    }

    function issueAsset(string calldata assetId, string calldata note) external onlyIssuer {
        _updateStatus(assetId, Status.Issued, note);
    }

    function suspendAsset(string calldata assetId, string calldata note) external onlyIssuer {
        _updateStatus(assetId, Status.Suspended, note);
    }

    function revokeAsset(string calldata assetId, string calldata note) external onlyIssuer {
        _updateStatus(assetId, Status.Revoked, note);
    }

    function updateStatus(string calldata assetId, Status newStatus, string calldata note) external onlyIssuer {
        _updateStatus(assetId, newStatus, note);
    }

    function verifyAsset(string calldata assetId)
        external
        view
        returns (bool exists, bool valid, Status status, address issuer)
    {
        Asset storage asset = assets[getAssetKey(assetId)];
        exists = asset.exists;
        status = asset.status;
        issuer = asset.issuer;
        valid = exists && status == Status.Issued;
    }

    function getAsset(string calldata assetId) external view returns (Asset memory) {
        bytes32 assetKey = getAssetKey(assetId);
        require(assets[assetKey].exists, "ASSET_NOT_FOUND");
        return assets[assetKey];
    }

    function getHistory(string calldata assetId) external view returns (HistoryItem[] memory) {
        bytes32 assetKey = getAssetKey(assetId);
        require(assets[assetKey].exists, "ASSET_NOT_FOUND");
        return histories[assetKey];
    }

    function getAssetKey(string memory assetId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(assetId));
    }

    function _updateStatus(string calldata assetId, Status newStatus, string calldata note) private {
        bytes32 assetKey = getAssetKey(assetId);
        Asset storage asset = assets[assetKey];
        require(asset.exists, "ASSET_NOT_FOUND");
        require(asset.status != Status.Revoked, "ASSET_REVOKED_FINAL");
        require(asset.status != newStatus, "STATUS_UNCHANGED");

        Status oldStatus = asset.status;
        asset.status = newStatus;
        asset.updatedAt = block.timestamp;

        histories[assetKey].push(
            HistoryItem({status: newStatus, actor: msg.sender, note: note, timestamp: block.timestamp})
        );

        emit AssetStatusUpdated(assetKey, assetId, oldStatus, newStatus, msg.sender, note);
    }
}
