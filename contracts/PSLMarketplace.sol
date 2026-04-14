// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface INFTWithTBA {
    function getTBAAddress(uint256 tokenId) external view returns (address);
}

contract PSLMarketplace is ReentrancyGuard, Ownable {
    address public nftContract;
    address public yieldContract;
    uint256 public platformFeeBps = 500;   // 5%
    uint256 public playerRoyaltyBps = 1000; // 10%

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed buyer, uint256 price, uint256 royalty, uint256 fee);
    event ListingCancelled(uint256 indexed tokenId);

    constructor(address _nft, address _yield) Ownable(msg.sender) {
        nftContract = _nft;
        yieldContract = _yield;
    }

    function listNFT(uint256 tokenId, uint256 price) external {
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not owner");
        require(price > 0, "Price must be > 0");
        listings[tokenId] = Listing(msg.sender, price, true);
        emit Listed(tokenId, msg.sender, price);
    }

    function buyNFT(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        require(l.active, "Not listed");
        require(msg.value == l.price, "Wrong price");

        uint256 fee      = (l.price * platformFeeBps) / 10000;
        uint256 royalty  = (l.price * playerRoyaltyBps) / 10000;
        uint256 seller   = l.price - fee - royalty;

        // Effects before interactions
        delete listings[tokenId];

        // Transfer NFT
        IERC721(nftContract).safeTransferFrom(l.seller, msg.sender, tokenId);

        // Send payments
        payable(l.seller).transfer(seller);
        address tba = INFTWithTBA(nftContract).getTBAAddress(tokenId);
        payable(tba).transfer(royalty);
        payable(yieldContract).transfer(fee);

        emit Sold(tokenId, msg.sender, l.price, royalty, fee);
    }

    function cancelListing(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not seller");
        delete listings[tokenId];
        emit ListingCancelled(tokenId);
    }

    function updatePrice(uint256 tokenId, uint256 newPrice) external {
        require(listings[tokenId].seller == msg.sender, "Not seller");
        listings[tokenId].price = newPrice;
    }

    function setPlatformFee(uint256 bps) external onlyOwner {
        platformFeeBps = bps;
    }
}