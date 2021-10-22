pub contract CryptoChumSprite {
    
    pub resource NFT {
        pub let id: UInt64
        pub let name: String
        pub let state: String

        init(id: UInt64, name: String, state: String) {
            self.id = id
            self.name = name
            self.state = state
        }
    }

    pub resource interface Receiver {
        pub fun deposit(sprite: @NFT, metadata: {String : String})
        pub fun getIDs(): [UInt64]
        pub fun getMetadata(id: UInt64) : {String : String}
    }

    pub resource Collection: Receiver {
        pub let sprites: @{UInt64: NFT}
        pub let metadataObjs: {UInt64: { String : String }}

        init() {
            self.sprites <- {}
            self.metadataObjs = {}
        }

        destroy() {
            destroy self.sprites
        }

        pub fun withdraw(spriteID: UInt64): @NFT {
            let sprite <- self.sprites.remove(key: spriteID)!

            return <- sprite
        }

        pub fun deposit(sprite: @NFT, metadata: {String : String}) {
            self.metadataObjs[sprite.id] = metadata 
            self.sprites[sprite.id] <-! sprite
        }

        pub fun getIDs(): [UInt64] {
            return self.sprites.keys
        }

        pub fun getMetadata(id: UInt64): {String : String} {
            // return self.sprites[id]?.metadata!
             // let sprite <- self.sprites[id]!
            // return sprite.metadata
            return self.metadataObjs[id]!
        }
    }

    pub resource Minter {
        pub var totalSupply: UInt64

        init() {
            self.totalSupply = 0
        }
        pub fun mint(name: String, state: String): @NFT {
            let nft <- create NFT(id: self.totalSupply + 1, name: name, state: state)
            self.totalSupply = self.totalSupply + 1
            return <- nft
        }
    }

    pub fun createCollection(): @Collection {
        return <- create Collection()
    }

    init() {
        self.account.save(
            <- create Minter(),
            to: /storage/cryptoChumSpriteMinter
        )

        self.account.link<&Minter>(
            /public/cryptoChumSpriteMinter,
            target: /storage/cryptoChumSpriteMinter
        )
        self.account.save(
            <- self.createCollection(),
            to: /storage/cryptoChumSpriteCollection
        )

        self.account.link<&{Receiver}>(
            /public/cryptoChumSpriteCollection,
            target: /storage/cryptoChumSpriteCollection
        )
    }
}