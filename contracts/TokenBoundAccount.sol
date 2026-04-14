// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

interface IERC6551Account {
    receive() external payable;
    function token() external view returns (uint256 chainId, address tokenContract, uint256 tokenId);
    function owner() external view returns (address);
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4);
}

contract TokenBoundAccount is IERC6551Account {
    uint256 public nonce;

    receive() external payable {}

    function execute(address to, uint256 value, bytes calldata data)
        external payable returns (bytes memory result)
    {
        require(msg.sender == owner(), "Not token owner");
        ++nonce;
        (bool success, bytes memory res) = to.call{value: value}(data);
        require(success, "Execution failed");
        return res;
    }

    function token() public view returns (uint256 chainId, address tokenContract, uint256 tokenId) {
        bytes memory footer = new bytes(0x60);
        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }
        return abi.decode(footer, (uint256, address, uint256));
    }

    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);
        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function isValidSignature(bytes32 hash, bytes memory signature)
        external view returns (bytes4)
    {
        bool valid = SignatureChecker.isValidSignatureNow(owner(), hash, signature);
        if (valid) return IERC1271.isValidSignature.selector;
        return bytes4(0);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}