// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Curios is Ownable {
    // Quest model
    struct Quest {
        address creator;
        uint index;
        string name;
        string hint;
        bytes32 merkleRoot;
        string merkleBody;
        uint maxWinners;
        string metadata;
        bool valid;
        address[] winnersIndex;
    }

    // State
    mapping(address => Quest[]) public quests;
    mapping(address => mapping(uint => mapping(address => bool))) public winners;

    // Events
    event QuestCreated(address indexed _tokenAddress, uint indexed _questIndex);
    event QuestCompleted(address indexed _tokenAddress, uint indexed _questIndex, address indexed _winner);
    event QuestInvalidated(address indexed _tokenAddress, uint indexed _questIndex);

    // Constructor
    constructor(address initialOwner) Ownable(initialOwner) {}

    // Creates a new quest
    function createQuest(
        address _tokenAddress,
        string memory _name,
        string memory _hint,
        uint _maxWinners,
        bytes32 _merkleRoot,
        string memory _merkleBody,
        string memory _metadata
    ) public onlyOwner {
        Quest storage newQuest = quests[_tokenAddress].push();
        uint questIndex = quests[_tokenAddress].length - 1;

        newQuest.creator = msg.sender;
        newQuest.index = questIndex;
        newQuest.name = _name;
        newQuest.hint = _hint;
        newQuest.merkleRoot = _merkleRoot;
        newQuest.merkleBody = _merkleBody;
        newQuest.maxWinners = _maxWinners;
        newQuest.metadata = _metadata;
        newQuest.valid = true;

        emit QuestCreated(_tokenAddress, questIndex);
    }

    // Submit proof for the quest
    function submitProof(
        address _tokenAddress,
        uint _questIndex,
        bytes32[] memory _proof,
        bytes32 _answer
    ) public {
        Quest storage quest = quests[_tokenAddress][_questIndex];

        require(quest.valid, "Quest is not valid");
        require(quest.winnersIndex.length < quest.maxWinners || quest.maxWinners == 0, "Max winners reached");
        require(msg.sender != quest.creator, "Creator cannot win their own quest");
        require(MerkleProof.verify(_proof, quest.merkleRoot, _answer), "Invalid Merkle proof");

        winners[_tokenAddress][_questIndex][msg.sender] = true;
        quest.winnersIndex.push(msg.sender);

        emit QuestCompleted(_tokenAddress, _questIndex, msg.sender);
    }

    // Invalidate a quest
    function invalidateQuest(address _tokenAddress, uint _questIndex) public {
        Quest storage quest = quests[_tokenAddress][_questIndex];
        require(msg.sender == quest.creator || msg.sender == owner(), "Not authorized");
        require(quest.valid, "Quest already invalidated");

        quest.valid = false;

        emit QuestInvalidated(_tokenAddress, _questIndex);
    }

    // Get quest details
    function getQuest(
        address _tokenAddress,
        uint _questIndex
    ) public view returns (
        address creator,
        uint index,
        string memory name,
        string memory hint,
        bytes32 merkleRoot,
        string memory merkleBody,
        uint maxWinners,
        string memory metadata,
        bool valid,
        address[] memory winnersIndex
    ) {
        Quest storage quest = quests[_tokenAddress][_questIndex];
        return (
            quest.creator,
            quest.index,
            quest.name,
            quest.hint,
            quest.merkleRoot,
            quest.merkleBody,
            quest.maxWinners,
            quest.metadata,
            quest.valid,
            quest.winnersIndex
        );
    }

    // Get quest winners
    function getQuestWinners(
        address _tokenAddress,
        uint _questIndex
    ) public view returns (address[] memory) {
        return quests[_tokenAddress][_questIndex].winnersIndex;
    }
}
